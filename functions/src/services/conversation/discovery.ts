import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendButtons } from "services/whatsapp/sendButtons";
import { callOpenAI } from "services/llm/openai";
import { flowMap, UseCase } from "config/flows";
import { Conversation } from "services/conversation/handleIncomingMessage";

const WELCOME_MESSAGE =
  "👋 Welcome to *Whybee*! I create personalised content for you.\n\nWhat would you like to make today?";

export async function discovery(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  // Button tap — direct intent, no LLM needed
  if (message.type === "button_reply") {
    const buttonId = message.buttonId;

    if (buttonId && buttonId in flowMap) {
      await initiateFlow(phone, conversation.conversationId, buttonId as UseCase);
      return;
    }
  }

  // User typed free text — try LLM intent detection
  if (message.type === "text" && message.text) {
    const detected = await detectIntent(message.text);
    if (detected) {
      await initiateFlow(phone, conversation.conversationId, detected);
      return;
    }
  }

  // Show welcome + buttons (first contact, unrecognised text, or after reset)
  await sendButtons(conversation.conversationId, phone, WELCOME_MESSAGE,
    Object.values(flowMap).map(f => ({ id: f.id, title: f.buttonTitle }))
  );
}

async function initiateFlow(phone: string, conversationId: string, useCase: UseCase): Promise<void> {
  await db.collection("conversations").doc(conversationId).update({
    useCase,
    status: "refining",
    updatedAt: new Date(),
  });

  logger.info("Flow initiated (conversational)", { phone, useCase });

  const { flowEngine } = await import("services/conversation/flowEngine");
  const syntheticConversation = {
    conversationId,
    phone,
    status: "refining" as const,
    useCase,
    collectedData: {},
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await flowEngine(phone, { type: "text", phone, messageId: "", timestamp: "", text: "" }, syntheticConversation);
}

async function detectIntent(text: string): Promise<UseCase | null> {
  const system = `You detect user intent for a WhatsApp content creation service.
We offer: birthday content, shop promo content, event invite content.
Return JSON: { "useCase": "birthday" | "shop" | "event" | null }
Return null if the intent is unclear.`;

  try {
    const raw = await callOpenAI(system, text);
    const parsed = JSON.parse(raw) as { useCase: UseCase | null };
    return parsed.useCase ?? null;
  } catch {
    return null;
  }
}
