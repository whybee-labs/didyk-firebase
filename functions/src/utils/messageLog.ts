import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { HistoryEntry } from "types/conversation";

const MAX_HISTORY = 10; // 5 pairs

// Log a system-sent message and append it to messageHistory (fire-and-forget)
export function logOutbound(conversationId: string, type: string, content: string): void {
  const convRef = db.collection("conversations").doc(conversationId);
  convRef.collection("messages").add({ role: "system", type, content, createdAt: new Date() })
    .catch((err) => logger.warn("Failed to log outbound message", { err }));
  db.runTransaction(async (txn) => {
    const snap = await txn.get(convRef);
    const current = (snap.data()?.messageHistory ?? []) as HistoryEntry[];
    const trimmed = [...current, { role: "assistant" as const, content, at: Date.now() }].slice(-MAX_HISTORY);
    txn.update(convRef, { messageHistory: trimmed });
  }).catch((err) => logger.warn("Failed to append outbound to messageHistory", { err }));
}
