import { db } from "utils/firestore";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendText } from "services/whatsapp/sendText";
import { getProductConfig, UseCase } from "config/products";
import { t } from "utils/t";
import { Conversation } from "./handleIncomingMessage";
import { startFulfillment } from "./fulfillment";
import { flowEngine } from "./flowEngine";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";

export async function sendConfirmation(phone: string, conversation: Conversation): Promise<void> {
  const config = getProductConfig(conversation.useCase as UseCase);
  let summary = config.confirmationTemplate(conversation.collectedData);

  if (conversation.useCase === "resume") {
    const missing = config.fields
      .filter((f) => !f.required && f.key !== "primaryColor" && !conversation.collectedData[f.key])
      .map((f) => f.label);
    if (missing.length > 0) {
      summary += t("resume.confirm.missingOptional", { list: missing.join(", ") });
    }
  }

  await db.collection("conversations").doc(conversation.conversationId).update({
    status: "confirming",
    updatedAt: new Date(),
  });

  await sendText(conversation.conversationId, phone, summary);
  await sendButtons(conversation.conversationId, phone, t("confirm.prompt"), [
    { id: "create", title: t("confirm.createButton") },
    { id: "edit",   title: t("confirm.editButton") },
  ]);
}

export async function handleConfirmation(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  if (message.type === "button_reply") {
    if (message.buttonId === "create") {
      await startFulfillment(phone, conversation);
      return;
    }
    if (message.buttonId === "edit") {
      await db.collection("conversations").doc(conversation.conversationId).update({
        status: "refining",
        updatedAt: new Date(),
      });
      await sendText(conversation.conversationId, phone, t("confirm.editPrompt"));
      return;
    }
  }

  // Text message = user is sending an edit (e.g. "replace summary with X")
  if (message.type === "text" && message.text?.trim()) {
    await db.collection("conversations").doc(conversation.conversationId).update({
      status: "refining",
      updatedAt: new Date(),
    });
    await flowEngine(phone, message, { ...conversation, status: "refining" });
    return;
  }

  await sendText(conversation.conversationId, phone, t("confirm.nudge"));
}
