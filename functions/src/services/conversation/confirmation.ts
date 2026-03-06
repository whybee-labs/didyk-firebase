import { db } from "../../utils/firestore";
import { sendButtons } from "../whatsapp/sendButtons";
import { getFlowConfig, UseCase } from "../../config/flows";
import { Conversation } from "./handleIncomingMessage";
import { startFulfillment } from "./fulfillment";

export async function sendConfirmation(phone: string, conversation: Conversation): Promise<void> {
  const config = getFlowConfig(conversation.useCase as UseCase);
  const summary = config.confirmationTemplate(conversation.collectedData);

  await db.collection("conversations").doc(conversation.conversationId).update({
    status: "confirming",
    updatedAt: new Date(),
  });

  await sendButtons(phone, summary, [
    { id: "create", title: "✅ Create it!" },
    { id: "restart", title: "🔄 Start Over" },
  ]);
}

export async function handleConfirmation(
  phone: string,
  message: { type: string; buttonId?: string },
  conversation: Conversation
): Promise<void> {
  if (message.type !== "button_reply") return;

  if (message.buttonId === "create") {
    await startFulfillment(phone, conversation);
    return;
  }

  if (message.buttonId === "restart") {
    await resetConversation(phone, conversation);
    return;
  }
}

// Reset in place — no new document, same conversation continues from discovery
async function resetConversation(phone: string, conversation: Conversation): Promise<void> {
  await db.collection("conversations").doc(conversation.conversationId).update({
    status: "discovery",
    useCase: null,
    collectedData: {},
    updatedAt: new Date(),
  });

  const { discovery } = await import("./discovery");
  await discovery(phone, { type: "text", phone, messageId: "", timestamp: "" }, {
    ...conversation,
    status: "discovery",
    useCase: undefined,
    collectedData: {},
  });
}
