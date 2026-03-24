import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { sendContact } from "services/whatsapp/sendContact";
import { sendButtons } from "services/whatsapp/sendButtons";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { Conversation } from "services/conversation/handleIncomingMessage";
import { WHATSAPP_PHONE_NUMBER } from "config/env";
import { t } from "utils/t";

const RATING_MAP: Record<string, string> = {
  "fb-excellent": "Excellent",
  "fb-good":      "Good",
  "fb-poor":      "Needs work",
};

export async function sendFeedbackRequest(conversationId: string, phone: string): Promise<void> {
  await db.collection("conversations").doc(conversationId).update({
    status: "awaiting_feedback",
    updatedAt: new Date(),
  });

  await sendButtons(conversationId, phone, t("feedback.prompt"), [
    { id: "fb-excellent", title: t("feedback.button.excellent") },
    { id: "fb-good",      title: t("feedback.button.good") },
    { id: "fb-poor",      title: t("feedback.button.poor") },
  ]);
}

export async function handleFeedback(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;

  if (message.type !== "button_reply" || !message.buttonId) {
    // Ignore unexpected messages — just leave the conversation open
    return;
  }

  const rating = RATING_MAP[message.buttonId] ?? message.buttonId;

  await db.collection("conversations").doc(cid).update({
    feedbackData: { rating, submittedAt: new Date() },
    status: "completed",
    updatedAt: new Date(),
  });

  const isPositive = message.buttonId === "fb-excellent" || message.buttonId === "fb-good";

  if (isPositive) {
    await sendText(cid, phone, t("feedback.sharePrompt"));
    await sendContact(cid, phone, t("feedback.shareContactName"), WHATSAPP_PHONE_NUMBER.value());
  } else {
    await sendText(cid, phone, t("feedback.thanks"));
  }
}
