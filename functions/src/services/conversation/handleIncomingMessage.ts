import { logger } from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { StructuredData, UnstructuredData, PendingQuestion } from "config/products/types";
import { t } from "utils/t";
import { Conversation, ConversationStatus, HistoryEntry } from "types/conversation";
import { handleIntake } from "services/conversation/intake";
import { handleUploading } from "services/conversation/uploading";
import { handleBriefing } from "services/conversation/briefing";
import { handleDrafting } from "services/conversation/drafting";
import { handlePlanning } from "services/conversation/planning";
import { handleConfirmation } from "services/conversation/confirmation";
import { handleFeedback } from "services/conversation/feedback";
import { PREVIEW_POLICY } from "config/previewPolicy";

// Re-export shared types for any files that imported them from here
export type { Conversation, ConversationStatus, HistoryEntry };

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

  // Voice notes not supported
  if (message.type === "audio") {
    await sendText(conversation.conversationId, phone, t("errors.voiceNoteNotAccepted"));
    return;
  }

  // "hi" / "reset" → restart from intake
  const txt = message.type === "text" ? message.text?.toLowerCase().trim() : "";
  const isReset = txt === "hi" || txt === "reset" || txt === "start over" || txt === "restart";
  if (isReset) {
    const fresh: Partial<Conversation> = {
      status: "intake",
      intentId: undefined,
      structuredData: { referenceImageUrls: [] },
      unstructuredData: {},
      pendingQuestion: undefined,
      messageHistory: undefined,
    };
    await db.collection("conversations").doc(conversation.conversationId).update({
      status: "intake",
      intentId: FieldValue.delete(),
      structuredData: { referenceImageUrls: [] },
      unstructuredData: {},
      pendingQuestion: FieldValue.delete(),
      processing: false,
      messageHistory: FieldValue.delete(),
      updatedAt: new Date(),
    });
    conversation = { ...conversation, ...fresh, processing: false };
  }

  logger.info("Routing message", {
    phone,
    status: conversation.status,
    type: message.type,
    conversationId: conversation.conversationId,
  });

  const now = new Date();
  await Promise.all([
    db.collection("users").doc(phone).update({
      lastSeenAt: now,
      ...(message.name ? { name: message.name } : {}),
    }),
    db.collection("conversations").doc(conversation.conversationId).update({ lastMessageAt: now }),
  ]);

  db.collection("conversations").doc(conversation.conversationId)
    .collection("messages").add({ ...message, createdAt: now })
    .catch((err) => logger.warn("Failed to log message", { err }));

  // Append incoming message to messageHistory for LLM context (skip on reset — history was just cleared)
  if (!isReset) {
    const userText = message.text?.trim() || (message.type === "image" ? "[image]" : null);
    if (userText) {
      const entry: HistoryEntry = { role: "user", content: userText, at: now.getTime() };
      const trimmed = [...(conversation.messageHistory ?? []), entry].slice(-10);
      conversation = { ...conversation, messageHistory: trimmed };
      db.collection("conversations").doc(conversation.conversationId).update({
        messageHistory: trimmed,
      }).catch((err) => logger.warn("Failed to append user message to messageHistory", { err }));
    }
  }

  // Processing lock — if an async operation is in progress, ask user to wait
  if (conversation.processing) {
    await sendText(conversation.conversationId, phone, t("status.processing"));
    return;
  }

  switch (conversation.status) {
    case "intake":
      await handleIntake(phone, message, conversation);
      break;

    case "uploading":
      await handleUploading(phone, message, conversation);
      break;

    case "drafting":
      await handleDrafting(phone, message, conversation);
      break;

    case "briefing":
      await handleBriefing(phone, message, conversation);
      break;

    case "planning":
      await handlePlanning(phone, message, conversation);
      break;

    case "confirming":
      await handleConfirmation(phone, message, conversation);
      break;

    case "generating":
      await sendText(conversation.conversationId, phone, t("status.generating"));
      break;

    case "awaiting_payment":
      if (message.type === "button_reply" && message.buttonId === "refine_brief") {
        const refinementCount = conversation.refinementCount ?? 0;
        if (refinementCount < PREVIEW_POLICY.maxRefinementsPerConversation) {
          await db.collection("conversations").doc(conversation.conversationId).update({
            status: "drafting",
            refinementCount: refinementCount + 1,
            pendingQuestion: FieldValue.delete(),
            updatedAt: new Date(),
          });
          conversation = { ...conversation, status: "drafting", refinementCount: refinementCount + 1, pendingQuestion: undefined };
          await handleDrafting(phone, message, conversation);
        } else {
          await sendText(conversation.conversationId, phone, t("fulfillment.refinementsExhausted"));
        }
      } else {
        await sendText(conversation.conversationId, phone, t("status.awaitingPayment"));
      }
      break;

    case "feedback":
      await handleFeedback(phone, message, conversation);
      break;

    default:
      // Unknown/completed state — restart
      await handleIntake(phone, message, conversation);
  }
}

async function getOrCreateConversation(phone: string): Promise<{ user: User; conversation: Conversation }> {
  const userRef = db.collection("users").doc(phone);

  return db.runTransaction(async (txn) => {
    const userSnap = await txn.get(userRef);
    const now = new Date();
    const existingUser: User | null = userSnap.exists ? (userSnap.data() as User) : null;

    if (existingUser?.activeConversationId) {
      const convSnap = await txn.get(
        db.collection("conversations").doc(existingUser.activeConversationId)
      );
      if (convSnap.exists) {
        const raw = convSnap.data() as Record<string, unknown>;
        const conversation: Conversation = {
          conversationId: convSnap.id,
          phone: raw.phone as string,
          status: (raw.status as ConversationStatus) ?? "intake",
          intentId: raw.intentId as string | undefined,
          structuredData: (raw.structuredData as StructuredData) ?? { referenceImageUrls: [] },
          unstructuredData: (raw.unstructuredData as UnstructuredData) ?? {},
          pendingQuestion: raw.pendingQuestion as PendingQuestion | undefined,
          processing: raw.processing as boolean | undefined,
          messageHistory: raw.messageHistory as HistoryEntry[] | undefined,
          cleanUrl: raw.cleanUrl as string | undefined,
          previewUrl: raw.previewUrl as string | undefined,
          refinementCount: raw.refinementCount as number | undefined,
          paymentData: raw.paymentData as Conversation["paymentData"],
          feedbackData: raw.feedbackData as Conversation["feedbackData"],
          lastMessageAt: (raw.lastMessageAt as any)?.toDate?.() ?? new Date(0),
          createdAt: (raw.createdAt as any)?.toDate?.() ?? new Date(0),
          updatedAt: (raw.updatedAt as any)?.toDate?.() ?? new Date(0),
        };

        if (conversation.status !== "completed") {
          const hoursSince = (Date.now() - conversation.lastMessageAt.getTime()) / (1000 * 60 * 60);
          if (hoursSince < IDLE_TIMEOUT_HOURS) {
            return { user: existingUser, conversation };
          }
        }
      }
    }

    const convRef = db.collection("conversations").doc();
    const convData = {
      phone,
      status: "intake" as ConversationStatus,
      structuredData: { referenceImageUrls: [] },
      unstructuredData: {},
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
