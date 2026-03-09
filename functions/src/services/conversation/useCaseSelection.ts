import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { sendList } from "services/whatsapp/sendList";
import { catalog, findUseCase } from "config/catalog";
import { Conversation } from "services/conversation/handleIncomingMessage";
import { sendConfirmation } from "services/conversation/confirmation";

export async function sendUseCaseSelection(phone: string, conversation: Conversation): Promise<void> {
  // Find which product corresponds to the current useCase
  const product = catalog
    .flatMap((c) => c.products)
    .find((p) => p.productConfigId === conversation.useCase);

  if (!product) {
    await sendText(conversation.conversationId, phone, "Something went wrong. Please type *hi* to start over.");
    return;
  }

  await db.collection("conversations").doc(conversation.conversationId).update({
    status: "selecting_usecases",
    updatedAt: new Date(),
  });

  await sendList(
    conversation.conversationId,
    phone,
    `Great! Now choose what you'd like created for your ${product.label}:`,
    "Choose",
    [
      {
        rows: product.useCases.map((uc) => ({
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
    await sendUseCaseSelection(phone, conversation);
    return;
  }

  if (!uc.outputs || uc.outputs.length === 0) {
    await sendText(conversation.conversationId, phone, "🔜 Coming soon! We're working hard on this one. Check back later!");
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
