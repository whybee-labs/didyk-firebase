import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { sendList } from "services/whatsapp/sendList";
import { getProductConfig, UseCase } from "config/products";
import { findProduct, findUseCase } from "config/catalog";
import { Conversation } from "services/conversation/handleIncomingMessage";
import { sendConfirmation } from "services/conversation/confirmation";

export async function sendUseCaseSelection(phone: string, conversation: Conversation): Promise<void> {
  const config = getProductConfig(conversation.useCase as UseCase);

  // Use the specific catalog product's use cases if we navigated to one via browsePath
  const prodId = [...(conversation.browsePath ?? [])].reverse().find((s) => s.startsWith("prod-"));
  const catalogProduct = prodId ? findProduct(prodId) : null;
  const useCases = catalogProduct?.useCases ?? config.useCases;

  await db.collection("conversations").doc(conversation.conversationId).update({
    status: "selecting_usecases",
    updatedAt: new Date(),
  });

  await sendList(
    conversation.conversationId,
    phone,
    `Great! Now choose what you'd like created for your ${config.name}:`,
    "Choose",
    [
      {
        rows: useCases.map((uc) => ({
          id: uc.id,
          title: uc.label,
          description: uc.description,
        })),
      },
    ]
  );
}

export async function handleUseCaseSelection(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  if (message.type !== "list_reply" || !message.listId) {
    await sendUseCaseSelection(phone, conversation);
    return;
  }

  const uc = findUseCase(message.listId);
  if (!uc) {
    await sendText(conversation.conversationId, phone, "Something went wrong. Please try again.");
    await sendUseCaseSelection(phone, conversation);
    return;
  }

  await db.collection("conversations").doc(conversation.conversationId).update({
    selectedUseCaseIds: [message.listId],
    status: "confirming",
    updatedAt: new Date(),
  });

  await sendConfirmation(phone, {
    ...conversation,
    selectedUseCaseIds: [message.listId],
    status: "confirming",
  });
}
