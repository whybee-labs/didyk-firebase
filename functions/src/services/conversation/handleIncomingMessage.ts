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
  | "selecting_filter"
  | "form_sent"
  | "refining"
  | "selecting_usecases"
  | "selecting_color"
  | "choose_input_method"
  | "waiting_for_pdf"
  | "reviewing_resume"
  | "confirming"
  | "generating"
  | "reviewing_preview"
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
  selectedFilters?: { withPhoto?: "yes" | "no" | "both" };
  selectedUseCaseIds?: string[];
  selectedPrimaryColor?: string;
  inputMethod?: "upload" | "scratch";
  /** Transient flag: when true, flowEngine should not auto-send confirmation even if form is complete. */
  suppressAutoConfirmation?: boolean;
  /** Resume: user has reviewed sections and typed "done". Gate for preview generation. */
  dataConfirmed?: boolean;
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

  // Voice notes not supported — send notice, then re-show current step
  if (message.type === "audio") {
    await sendText(conversation.conversationId, phone, t("errors.voiceNoteNotAccepted"));
    // Convert to a no-op text message so the routing below re-sends the current prompt
    message = { type: "text", text: "" } as ParsedMessage;
  }

  // "hi" / "reset" / "start over" resets conversation to discovery from any state
  const txt = message.type === "text" ? message.text?.toLowerCase().trim() : "";
  const isReset = txt === "hi" || txt === "reset" || txt === "start over" || txt === "restart";
  if (isReset) {
    await db.collection("conversations").doc(conversation.conversationId).update({
      status: "discovery",
      useCase: FieldValue.delete(),
      collectedData: {},
      browsePath: FieldValue.delete(),
      selectedFilters: FieldValue.delete(),
      selectedUseCaseIds: FieldValue.delete(),
      selectedPrimaryColor: FieldValue.delete(),
      inputMethod: FieldValue.delete(),
      dataConfirmed: FieldValue.delete(),
      messageHistory: FieldValue.delete(),
      updatedAt: new Date(),
    });
    conversation = {
      ...conversation,
      status: "discovery",
      useCase: undefined,
      collectedData: {},
      browsePath: undefined,
      selectedFilters: undefined,
      selectedUseCaseIds: undefined,
      selectedPrimaryColor: undefined,
      inputMethod: undefined,
      dataConfirmed: undefined,
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

    case "selecting_color": {
      if (message.type === "list_reply" && message.listId) {
        const { handleColorSelection } = await import("services/conversation/resumeColorSelection");
        await handleColorSelection(phone, message.listId, conversation);
      } else {
        const { sendResumeColorOptions } = await import("services/conversation/resumeColorSelection");
        await sendResumeColorOptions(phone, conversation);
      }
      break;
    }

    case "choose_input_method": {
      if (message.type === "button_reply" && message.buttonId) {
        const { handleInputMethodSelection } = await import("services/conversation/resumeInputMethod");
        await handleInputMethodSelection(phone, message.buttonId, conversation);
      } else {
        const { sendInputMethodPrompt } = await import("services/conversation/resumeInputMethod");
        await sendInputMethodPrompt(phone, conversation);
      }
      break;
    }

    case "waiting_for_pdf": {
      if (message.type === "document" && message.mediaId) {
        const { handleResumePdfUpload } = await import("services/conversation/resumePdfUpload");
        await handleResumePdfUpload(phone, message.mediaId, conversation);
      } else {
        await sendText(conversation.conversationId, phone, t("resume.upload.nudge"));
      }
      break;
    }

    case "reviewing_resume": {
      if (message.type === "text" && message.text?.toLowerCase().trim() === "done") {
        const config = getProductConfig(conversation.useCase as UseCase);
        const missingRequired = config.fields.filter(
          (f) => f.required && f.type === "text" && !conversation.collectedData[f.key]
        );
        if (missingRequired.length > 0) {
          const msg =
            missingRequired.length === 1
              ? t("form.followup.single", { field: missingRequired[0].label })
              : t("form.followup.many", { fields: missingRequired.map((f) => f.label).join(", ") });
          await sendText(conversation.conversationId, phone, msg);
          break;
        }
        // Set dataConfirmed and let the flow router decide what's next
        await db.collection("conversations").doc(conversation.conversationId).update({
          dataConfirmed: true,
          updatedAt: new Date(),
        });
        const { advanceResumeFlow } = await import("services/conversation/resumeFlowRouter");
        await advanceResumeFlow(phone, { ...conversation, dataConfirmed: true });
        break;
      }

      // Treat anything else as an edit: reuse flowEngine, then re-send all sections.
      await flowEngine(phone, message, { ...conversation, status: "refining", suppressAutoConfirmation: true });

      const convRef = db.collection("conversations").doc(conversation.conversationId);
      const convSnap = await convRef.get();
      if (!convSnap.exists) break;
      const updated = {
        conversationId: convSnap.id,
        ...(convSnap.data() as Omit<Conversation, "conversationId">),
      } as Conversation;

      await convRef.update({ status: "reviewing_resume", updatedAt: new Date() });

      const { sendResumeSectionsForReview } = await import("services/conversation/resumePdfUpload");
      await sendResumeSectionsForReview(conversation.conversationId, phone, updated.collectedData);
      break;
    }

    case "confirming":
      await handleConfirmation(phone, message, conversation);
      break;

    case "generating":
      await sendText(conversation.conversationId, phone, t("status.generating"));
      break;

    case "reviewing_preview": {
      if (message.type === "button_reply" && message.buttonId) {
        if (message.buttonId === "generate_final") {
          // Create payment link and send
          const config = getProductConfig(conversation.useCase as UseCase);
          const currency = phone.startsWith("91") ? "INR" : "USD";
          const symbol = currency === "INR" ? "₹" : "$";
          const { findUseCase } = await import("config/catalog");
          const selectedUc = findUseCase(conversation.selectedUseCaseIds?.[0] ?? "");
          const amount = selectedUc?.pricing[currency] ?? 0;
          const { createPaymentLink } = await import("services/payment/createPaymentLink");
          const { id, shortUrl } = await createPaymentLink(phone, conversation.conversationId, amount, `Whybee ${config.name}`, currency);
          const { sendCTAButton } = await import("services/whatsapp/sendCTAButton");
          await sendCTAButton(conversation.conversationId, phone, t("fulfillment.payment"), t("fulfillment.paymentButton", { symbol, amount: String(amount) }), shortUrl);
          await db.collection("conversations").doc(conversation.conversationId).update({
            status: "awaiting_payment",
            paymentData: { linkId: id, amount, currency, createdAt: new Date() },
            updatedAt: new Date(),
          });
        } else if (message.buttonId === "change_template") {
          // Clear template + color, let router find the next unfilled step
          await db.collection("conversations").doc(conversation.conversationId).update({
            selectedUseCaseIds: FieldValue.delete(),
            selectedPrimaryColor: FieldValue.delete(),
            updatedAt: new Date(),
          });
          const { advanceResumeFlow } = await import("services/conversation/resumeFlowRouter");
          await advanceResumeFlow(phone, { ...conversation, selectedUseCaseIds: undefined, selectedPrimaryColor: undefined });
        } else if (message.buttonId === "edit_details") {
          // Clear dataConfirmed so user must type "done" again after editing
          await db.collection("conversations").doc(conversation.conversationId).update({
            dataConfirmed: false,
            updatedAt: new Date(),
          });
          const { advanceResumeFlow } = await import("services/conversation/resumeFlowRouter");
          await advanceResumeFlow(phone, { ...conversation, dataConfirmed: false });
        }
      } else {
        // Text message — treat as edit intent
        await db.collection("conversations").doc(conversation.conversationId).update({
          dataConfirmed: false,
          updatedAt: new Date(),
        });
        await flowEngine(phone, message, { ...conversation, status: "refining", suppressAutoConfirmation: true });
        const convRef3 = db.collection("conversations").doc(conversation.conversationId);
        const convSnap3 = await convRef3.get();
        if (convSnap3.exists) {
          const updated3 = { conversationId: convSnap3.id, ...(convSnap3.data() as Omit<Conversation, "conversationId">) } as Conversation;
          await convRef3.update({ status: "reviewing_resume", updatedAt: new Date() });
          const { sendResumeSectionsForReview } = await import("services/conversation/resumePdfUpload");
          await sendResumeSectionsForReview(conversation.conversationId, phone, updated3.collectedData);
        }
      }
      break;
    }

    case "awaiting_payment": {
      const wantsEdit =
        message.type === "text" &&
        message.text &&
        (message.text.length > 25 ||
          /change|edit|update|modify|wrong|fix|correct|add|remove|replace/i.test(message.text.trim()));
      if (wantsEdit) {
        await db.collection("conversations").doc(conversation.conversationId).update({
          status: "refining",
          updatedAt: new Date(),
        });
        await sendText(conversation.conversationId, phone, t("fulfillment.editFromPreview"));
        await flowEngine(phone, message, { ...conversation, status: "refining" });
      } else {
        await sendText(conversation.conversationId, phone, t("status.awaitingPayment"));
      }
      break;
    }

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
