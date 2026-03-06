import { logger } from "firebase-functions";
import { db } from "../../utils/firestore";
import { ParsedMessage } from "../whatsapp/parseWebhookPayload";
import { sendButtons } from "../whatsapp/sendButtons";
import { sendText } from "../whatsapp/sendText";
import { sendFlow } from "../whatsapp/sendFlow";
import { callOpenAI } from "../llm/openai";
import { getFlowConfig, UseCase } from "../../config/flows";
import { Conversation } from "./handleIncomingMessage";

const WELCOME_MESSAGE =
  "👋 Welcome to *Whybee*! I can create personalised videos for you.\n\nWhat would you like to make today?";

export async function discovery(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  // Button tap — direct intent, no LLM needed
  if (message.type === "button_reply") {
    const useCase = message.buttonId as UseCase;
    if (useCase === "birthday" || useCase === "shop" || useCase === "event") {
      await initiateFlow(phone, conversation.conversationId, useCase);
      return;
    }
  }

  // First contact or any text — send welcome + buttons
  if (!conversation.collectedData.welcomeSent) {
    await db.collection("conversations").doc(conversation.conversationId).update({
      "collectedData.welcomeSent": true,
      updatedAt: new Date(),
    });
    await sendButtons(phone, WELCOME_MESSAGE, [
      { id: "birthday", title: "🎂 Birthday" },
      { id: "shop", title: "🛍 Shop Promo" },
      { id: "event", title: "🎉 Event Invite" },
    ]);
    return;
  }

  // User typed free text — try LLM intent detection
  if (message.type === "text" && message.text) {
    const detected = await detectIntent(message.text);
    if (detected) {
      await initiateFlow(phone, conversation.conversationId, detected);
      return;
    }
  }

  // Could not detect intent — nudge toward buttons
  await sendButtons(
    phone,
    "I didn't quite catch that! Please choose what you'd like to create:",
    [
      { id: "birthday", title: "🎂 Birthday" },
      { id: "shop", title: "🛍 Shop Promo" },
      { id: "event", title: "🎉 Event Invite" },
    ]
  );
}

async function initiateFlow(phone: string, conversationId: string, useCase: UseCase): Promise<void> {
  const config = getFlowConfig(useCase);

  await db.collection("conversations").doc(conversationId).update({
    useCase,
    status: "form_sent",
    updatedAt: new Date(),
  });

  await sendText(phone, `Great choice! Let me pull up a quick form for your ${config.name}. 📋`);

  await sendFlow(
    phone,
    config.waFlowId,
    config.name,
    `Please fill in the details for your ${config.name}.`
  );

  logger.info("Flow sent", { phone, useCase, flowId: config.waFlowId });
}

async function detectIntent(text: string): Promise<UseCase | null> {
  const system = `You detect user intent for a WhatsApp video creation service.
We offer: birthday videos, shop promo videos, event invite videos.
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
