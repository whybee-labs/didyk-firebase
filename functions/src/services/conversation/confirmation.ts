import { db } from "../../utils/firestore";
import { sendButtons } from "../whatsapp/sendButtons";
import { getFlowConfig, UseCase } from "../../config/flows";
import { Session } from "./handleIncomingMessage";
import { startFulfillment } from "./fulfillment";

export async function sendConfirmation(phone: string, session: Session): Promise<void> {
  const config = getFlowConfig(session.useCase as UseCase);
  const summary = config.confirmationTemplate(session.collectedData);

  await db.collection("conversations").doc(session.sessionId).update({
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
  session: Session
): Promise<void> {
  if (message.type !== "button_reply") return;

  if (message.buttonId === "create") {
    await startFulfillment(phone, session);
    return;
  }

  if (message.buttonId === "restart") {
    await resetConversation(phone, session);
    return;
  }
}

// Reset in place — no new document, same conversation continues from discovery
async function resetConversation(phone: string, session: Session): Promise<void> {
  await db.collection("conversations").doc(session.sessionId).update({
    status: "discovery",
    useCase: null,
    collectedData: {},
    updatedAt: new Date(),
  });

  const resetSession: Session = {
    ...session,
    status: "discovery",
    useCase: undefined,
    collectedData: {},
  };

  const { discovery } = await import("./discovery");
  await discovery(phone, { type: "text", phone, messageId: "", timestamp: "" }, resetSession);
}
