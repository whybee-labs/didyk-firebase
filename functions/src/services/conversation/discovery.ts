import { logger } from "firebase-functions";
import { db } from "../../utils/firestore";
import { ParsedMessage } from "../whatsapp/parseWebhookPayload";
import { sendButtons } from "../whatsapp/sendButtons";
import { sendText } from "../whatsapp/sendText";
import { sendVideo } from "../whatsapp/sendVideo";
import { sendImage } from "../whatsapp/sendImage";
import { sendAudio } from "../whatsapp/sendAudio";
import { sendDocument } from "../whatsapp/sendDocument";
import { callOpenAI } from "../llm/openai";
import { UseCase } from "../../config/flows";
import { Conversation } from "./handleIncomingMessage";
import { generateVideo } from "../generators/videoGenerator";
import { generateImage } from "../generators/imageGenerator";
import { generateAudio } from "../generators/audioGenerator";
import { generatePdf } from "../generators/pdfGenerator";
import { generateText } from "../generators/textGenerator";

const WELCOME_MESSAGE =
  "👋 Welcome to *Whybee*! I can create personalised videos for you.\n\nWhat would you like to make today?";

export async function discovery(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  // Button tap — direct intent, no LLM needed
  if (message.type === "button_reply") {
    const buttonId = message.buttonId;

    if (buttonId === "birthday" || buttonId === "shop" || buttonId === "event") {
      await initiateFlow(phone, conversation.conversationId, buttonId as UseCase);
      return;
    }

    // Test media buttons — run stub generators and send the result
    if (buttonId === "test-video") {
      const url = await generateVideo({});
      await sendVideo(phone, url);
      return;
    }
    if (buttonId === "test-image") {
      const url = await generateImage({});
      await sendImage(phone, url);
      return;
    }
    if (buttonId === "test-audio") {
      const url = await generateAudio({});
      await sendAudio(phone, url);
      return;
    }
    if (buttonId === "test-pdf") {
      const url = await generatePdf({});
      await sendDocument(phone, url, "test.pdf");
      return;
    }
    if (buttonId === "test-text") {
      const msg = await generateText({ note: "test message" });
      await sendText(phone, msg);
      return;
    }
  }

  // First contact — send welcome + buttons
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
    await sendButtons(phone, "🧪 *Test media types:*", [
      { id: "test-video", title: "🎬 Video" },
      { id: "test-image", title: "🖼 Image" },
      { id: "test-audio", title: "🎵 Audio" },
    ]);
    await sendButtons(phone, "​", [
      { id: "test-pdf", title: "📄 PDF" },
      { id: "test-text", title: "💬 Text" },
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
  await db.collection("conversations").doc(conversationId).update({
    useCase,
    status: "refining",
    updatedAt: new Date(),
  });

  logger.info("Flow initiated (conversational)", { phone, useCase });

  const { flowEngine } = await import("./flowEngine");
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
