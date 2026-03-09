import { logger } from "firebase-functions";
import { db } from "utils/firestore";

// Log a system-sent message to the conversation's messages subcollection (fire-and-forget)
export function logOutbound(conversationId: string, type: string, content: string): void {
  db.collection("conversations").doc(conversationId)
    .collection("messages").add({ role: "system", type, content, createdAt: new Date() })
    .catch((err) => logger.warn("Failed to log outbound message", { err }));
}
