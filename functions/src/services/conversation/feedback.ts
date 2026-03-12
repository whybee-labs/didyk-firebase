import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { sendButtons } from "services/whatsapp/sendButtons";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { Conversation } from "services/conversation/handleIncomingMessage";
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
    { id: "fb-excellent", title: "🔥 Excellent!" },
    { id: "fb-good",      title: "👍 Pretty good" },
    { id: "fb-poor",      title: "👎 Needs work" },
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

  await sendText(cid, phone, t("feedback.thanks"));
}
