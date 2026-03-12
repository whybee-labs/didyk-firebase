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

  // Phase 1: waiting for rating button
  if (!conversation.feedbackData?.rating) {
    if (message.type !== "button_reply" || !message.buttonId) {
      // Re-prompt if they sent something unexpected
      await sendButtons(cid, phone, t("feedback.prompt"), [
        { id: "fb-excellent", title: "🔥 Excellent!" },
        { id: "fb-good",      title: "👍 Pretty good" },
        { id: "fb-poor",      title: "👎 Needs work" },
      ]);
      return;
    }

    const rating = RATING_MAP[message.buttonId] ?? message.buttonId;

    await db.collection("conversations").doc(cid).update({
      feedbackData: { rating, submittedAt: new Date() },
      updatedAt: new Date(),
    });

    await sendText(cid, phone, t("feedback.commentPrompt"));
    return;
  }

  // Phase 2: waiting for optional comment
  const isSkip = message.type === "text" && message.text?.toLowerCase().trim() === "skip";
  const comment = !isSkip && message.type === "text" && message.text ? message.text.trim() : undefined;

  await db.collection("conversations").doc(cid).update({
    ...(comment ? { "feedbackData.comment": comment } : {}),
    status: "completed",
    updatedAt: new Date(),
  });

  await sendText(cid, phone, isSkip ? t("feedback.skip") : t("feedback.thanks"));
}
