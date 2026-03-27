import { StructuredData, UnstructuredData, PendingQuestion } from "config/products/types";

export type ConversationStatus =
  | "intake"
  | "uploading"
  | "briefing"
  | "planning"
  | "confirming"
  | "generating"
  | "awaiting_payment"
  | "delivering"
  | "feedback"
  | "completed";

export interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
  at: number; // ms timestamp — ensures arrayUnion treats each turn as unique
}

export interface Conversation {
  conversationId: string;
  phone: string;
  status: ConversationStatus;
  intentId?: string;
  structuredData: StructuredData;
  unstructuredData: UnstructuredData;
  pendingQuestion?: PendingQuestion;
  messageHistory?: HistoryEntry[];
  paymentData?: {
    linkId: string;
    amount: number;
    currency: "INR" | "USD";
    createdAt: Date;
    paidAt?: Date;
  };
  feedbackData?: {
    rating: string;
    submittedAt: Date;
  };
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
