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
  /** Original full-quality output URL — stored at generation time, delivered post-payment. */
  cleanUrl?: string;
  /** Watermarked / low-res preview URL — sent to user before payment. */
  previewUrl?: string;
  /** Number of times the user has gone back to briefing to refine within this conversation. */
  refinementCount?: number;
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
