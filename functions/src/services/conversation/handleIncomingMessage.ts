import { logger } from "firebase-functions";
import { db } from "../../utils/firestore";
import { ParsedMessage } from "../whatsapp/parseWebhookPayload";
import { sendText } from "../whatsapp/sendText";
import { getFlowConfig, UseCase } from "../../config/flows";
import { discovery } from "./discovery";
import { flowEngine } from "./flowEngine";
import { handleConfirmation } from "./confirmation";

export type ConversationStatus =
  | "discovery"
  | "form_sent"
  | "refining"
  | "confirming"
  | "generating"
  | "awaiting_payment"
  | "completed"
  | "error";

export interface Session {
  sessionId: string;
  phone: string;
  status: ConversationStatus;
  useCase?: UseCase;
  collectedData: Record<string, unknown>;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  phone: string;
  activeSessionId: string | null;
  totalSessions: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

const IDLE_TIMEOUT_HOURS = 8;

export async function handleIncomingMessage(
  phone: string,
  message: ParsedMessage
): Promise<void> {
  const { session } = await getOrCreateSession(phone);

  logger.info("Routing message", {
    phone,
    status: session.status,
    type: message.type,
    sessionId: session.sessionId,
  });

  const now = new Date();

  // Update lastSeenAt on user and lastMessageAt on conversation
  await Promise.all([
    db.collection("users").doc(phone).update({ lastSeenAt: now }),
    db.collection("conversations").doc(session.sessionId).update({ lastMessageAt: now }),
  ]);

  // Log message to subcollection (fire and forget — don't block routing)
  db.collection("conversations").doc(session.sessionId)
    .collection("messages").add({ ...message, createdAt: now })
    .catch((err) => logger.warn("Failed to log message", { err }));

  switch (session.status) {
    case "discovery":
      await discovery(phone, message, session);
      break;

    case "form_sent":
      await handleFormReply(phone, message, session);
      break;

    case "refining":
      await flowEngine(phone, message, session);
      break;

    case "confirming":
      await handleConfirmation(phone, message, session);
      break;

    case "generating":
      await sendText(phone, "⏳ Still working on it, hang tight!");
      break;

    case "awaiting_payment":
      await sendText(phone, "💳 Please complete your payment using the link sent above.");
      break;

    default:
      await discovery(phone, message, session);
  }
}

async function handleFormReply(
  phone: string,
  message: ParsedMessage,
  session: Session
): Promise<void> {
  if (message.type !== "form_reply" || !message.formData) {
    await sendText(phone, "Please complete the form first, then we can continue! 📋");
    return;
  }

  const config = getFlowConfig(session.useCase as UseCase);
  const firestoreUpdates: Record<string, unknown> = {};
  const localUpdates: Record<string, unknown> = {};

  for (const field of config.fields) {
    if (field.formKey && message.formData[field.formKey] !== undefined) {
      firestoreUpdates[`collectedData.${field.key}`] = message.formData[field.formKey];
      localUpdates[field.key] = message.formData[field.formKey];
    }
  }

  await db.collection("conversations").doc(session.sessionId).update({
    ...firestoreUpdates,
    status: "refining",
    updatedAt: new Date(),
  });

  const updatedSession: Session = {
    ...session,
    status: "refining",
    collectedData: { ...session.collectedData, ...localUpdates },
  };

  await flowEngine(phone, message, updatedSession);
}

async function getOrCreateSession(phone: string): Promise<{ user: User; session: Session }> {
  const userRef = db.collection("users").doc(phone);
  const userSnap = await userRef.get();

  let user: User;

  if (userSnap.exists) {
    user = userSnap.data() as User;
  } else {
    user = {
      phone,
      activeSessionId: null,
      totalSessions: 0,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    };
    await userRef.set(user);
  }

  if (user.activeSessionId) {
    const sessionSnap = await db.collection("conversations").doc(user.activeSessionId).get();
    if (sessionSnap.exists) {
      const session = sessionSnap.data() as Session;

      // Resume if not completed and still within the idle window
      if (session.status !== "completed") {
        const lastMessageAt = (session.lastMessageAt as any)?.toDate?.() ?? new Date(0);
        const hoursSince = (Date.now() - lastMessageAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < IDLE_TIMEOUT_HOURS) {
          return { user, session };
        }
      }
    }
  }

  // Create a new conversation
  const sessionRef = db.collection("conversations").doc();
  const session: Session = {
    sessionId: sessionRef.id,
    phone,
    status: "discovery",
    collectedData: {},
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await sessionRef.set(session);

  await userRef.update({
    activeSessionId: sessionRef.id,
    totalSessions: (user.totalSessions ?? 0) + 1,
    lastSeenAt: new Date(),
  });

  return { user, session };
}
