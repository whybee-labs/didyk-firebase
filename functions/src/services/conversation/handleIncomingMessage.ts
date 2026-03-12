import { logger } from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { getProductConfig, UseCase } from "config/products";
import { discovery } from "services/conversation/discovery";
import { flowEngine } from "services/conversation/flowEngine";
import { handleConfirmation } from "services/conversation/confirmation";
import { handleUseCaseSelection } from "services/conversation/useCaseSelection";
import { handleFeedback } from "services/conversation/feedback";
import { t } from "utils/t";

export type ConversationStatus =
  | "discovery"
  | "browsing"
  | "form_sent"
  | "refining"
  | "selecting_usecases"
  | "confirming"
  | "generating"
  | "awaiting_payment"
  | "awaiting_feedback"
  | "completed"
  | "error";

export interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  conversationId: string; // not stored in Firestore — populated from doc ID on read
  phone: string;
  status: ConversationStatus;
  useCase?: UseCase;
  collectedData: Record<string, unknown>;
  browsePath?: string[];
  selectedUseCaseIds?: string[];
  paymentData?: {
    linkId: string;
    amount: number;
    currency: "INR" | "USD";
    createdAt: Date;
    paidAt?: Date;
  };
  feedbackData?: {
    rating: string;
    comment?: string;
    submittedAt: Date;
  };
  messageHistory?: HistoryEntry[];
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  phone: string;
  activeConversationId: string | null;
  totalConversations: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

const IDLE_TIMEOUT_HOURS = 8;

export async function handleIncomingMessage(
  phone: string,
  message: ParsedMessage
): Promise<void> {
  let { conversation } = await getOrCreateConversation(phone);

  // "hi" resets conversation to discovery from any state (useful for testing)
  if (message.type === "text" && message.text?.toLowerCase().trim() === "hi") {
    await db.collection("conversations").doc(conversation.conversationId).update({
      status: "discovery",
      useCase: FieldValue.delete(),
      collectedData: {},
      browsePath: FieldValue.delete(),
      selectedUseCaseIds: FieldValue.delete(),
      messageHistory: FieldValue.delete(),
      updatedAt: new Date(),
    });
    conversation = {
      ...conversation,
      status: "discovery",
      useCase: undefined,
      collectedData: {},
      browsePath: undefined,
      selectedUseCaseIds: undefined,
      messageHistory: undefined,
    };
  }

  logger.info("Routing message", {
    phone,
    status: conversation.status,
    type: message.type,
    conversationId: conversation.conversationId,
  });

  const now = new Date();

  // Update lastSeenAt on user and lastMessageAt on conversation
  await Promise.all([
    db.collection("users").doc(phone).update({ lastSeenAt: now }),
    db.collection("conversations").doc(conversation.conversationId).update({ lastMessageAt: now }),
  ]);

  // Log message to subcollection (fire and forget — don't block routing)
  db.collection("conversations").doc(conversation.conversationId)
    .collection("messages").add({ ...message, createdAt: now })
    .catch((err) => logger.warn("Failed to log message", { err }));

  switch (conversation.status) {
    case "discovery":
      await discovery(phone, message, conversation);
      break;

    case "browsing": {
      const { browsing } = await import("services/conversation/browsing");
      await browsing(phone, message, conversation);
      break;
    }

    case "form_sent":
      await handleFormReply(phone, message, conversation);
      break;

    case "refining":
      await flowEngine(phone, message, conversation);
      break;

    case "selecting_usecases":
      await handleUseCaseSelection(phone, message, conversation);
      break;

    case "confirming":
      await handleConfirmation(phone, message, conversation);
      break;

    case "generating":
      await sendText(conversation.conversationId, phone, t("status.generating"));
      break;

    case "awaiting_payment":
      await sendText(conversation.conversationId, phone, t("status.awaitingPayment"));
      break;

    case "awaiting_feedback":
      await handleFeedback(phone, message, conversation);
      break;

    default:
      await discovery(phone, message, conversation);
  }
}

async function handleFormReply(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  if (message.type !== "form_reply" || !message.formData) {
    await sendText(conversation.conversationId, phone, t("form.required"));
    return;
  }

  const config = getProductConfig(conversation.useCase as UseCase);
  const firestoreUpdates: Record<string, unknown> = {};
  const localUpdates: Record<string, unknown> = {};

  for (const field of config.fields) {
    if (field.formKey && message.formData[field.formKey] !== undefined) {
      firestoreUpdates[`collectedData.${field.key}`] = message.formData[field.formKey];
      localUpdates[field.key] = message.formData[field.formKey];
    }
  }

  await db.collection("conversations").doc(conversation.conversationId).update({
    ...firestoreUpdates,
    status: "refining",
    updatedAt: new Date(),
  });

  await flowEngine(phone, message, {
    ...conversation,
    status: "refining",
    collectedData: { ...conversation.collectedData, ...localUpdates },
  });
}

async function getOrCreateConversation(phone: string): Promise<{ user: User; conversation: Conversation }> {
  const userRef = db.collection("users").doc(phone);

  return db.runTransaction(async (txn) => {
    const userSnap = await txn.get(userRef);
    const now = new Date();

    const existingUser: User | null = userSnap.exists ? (userSnap.data() as User) : null;

    // Try to resume existing conversation
    if (existingUser?.activeConversationId) {
      const convSnap = await txn.get(
        db.collection("conversations").doc(existingUser.activeConversationId)
      );
      if (convSnap.exists) {
        const conversation: Conversation = {
          conversationId: convSnap.id,
          ...(convSnap.data() as Omit<Conversation, "conversationId">),
        };
        if (conversation.status !== "completed") {
          const lastMessageAt = (conversation.lastMessageAt as any)?.toDate?.() ?? new Date(0);
          const hoursSince = (Date.now() - lastMessageAt.getTime()) / (1000 * 60 * 60);
          if (hoursSince < IDLE_TIMEOUT_HOURS) {
            return { user: existingUser, conversation };
          }
        }
      }
    }

    // Create a new conversation (conversationId is the doc ID — not stored as a field)
    const convRef = db.collection("conversations").doc();
    const convData = {
      phone,
      status: "discovery" as ConversationStatus,
      collectedData: {},
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    };
    txn.set(convRef, convData);

    const user: User = existingUser
      ? { ...existingUser, activeConversationId: convRef.id, totalConversations: (existingUser.totalConversations ?? 0) + 1, lastSeenAt: now }
      : { phone, activeConversationId: convRef.id, totalConversations: 1, firstSeenAt: now, lastSeenAt: now };
    txn.set(userRef, user);

    return { user, conversation: { conversationId: convRef.id, ...convData } };
  });
}
