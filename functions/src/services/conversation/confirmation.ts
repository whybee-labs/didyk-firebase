import { db } from "utils/firestore";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendText } from "services/whatsapp/sendText";
import { getProductConfig, UseCase } from "config/products";
import { t } from "utils/t";
import { Conversation } from "./handleIncomingMessage";
import { sendUseCaseSelection } from "./useCaseSelection";

export async function sendConfirmation(phone: string, conversation: Conversation): Promise<void> {
  const config = getProductConfig(conversation.useCase as UseCase);
  const summary = config.confirmationTemplate(conversation.collectedData);

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
  message: { type: string; buttonId?: string },
  conversation: Conversation
): Promise<void> {
  if (message.type !== "button_reply") {
    await sendText(conversation.conversationId, phone, t("confirm.nudge"));
    return;
  }

  if (message.buttonId === "create") {
    await sendUseCaseSelection(phone, conversation);
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
