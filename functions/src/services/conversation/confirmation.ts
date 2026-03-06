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
    await resetSession(phone, session.sessionId);
    return;
  }
}

async function resetSession(phone: string, sessionId: string): Promise<void> {
  // Mark current session as cancelled
  await db.collection("conversations").doc(sessionId).update({
    status: "cancelled",
    updatedAt: new Date(),
  });

  // Create a fresh session
  const newSessionRef = db.collection("conversations").doc();
  const newSession: Session = {
    sessionId: newSessionRef.id,
    phone,
    status: "discovery",
    collectedData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await newSessionRef.set(newSession);

  // Point user to new session
  await db.collection("users").doc(phone).update({
    activeSessionId: newSessionRef.id,
    updatedAt: new Date(),
  });

  // Trigger discovery on the new session (imported lazily to avoid circular dep)
  const { discovery } = await import("./discovery");
  await discovery(phone, { type: "text", phone, messageId: "", timestamp: "" }, newSession);
}
