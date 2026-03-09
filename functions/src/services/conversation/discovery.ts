import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendList } from "services/whatsapp/sendList";
import { catalog, popularProducts } from "config/catalog";
import { UseCase } from "config/products";
import { Conversation } from "services/conversation/handleIncomingMessage";

const WELCOME_BODY =
  "👋 Welcome to *Whybee*! I create personalised content for you.\n\nHere are some popular options — or browse the full catalog below 👇";

export async function discovery(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;

  // Popular product button tapped — skip category, go straight to that product's use cases
  if (message.type === "button_reply" && message.buttonId?.startsWith("prod-")) {
    const browsePath = [message.buttonId];
    await db.collection("conversations").doc(cid).update({
      status: "browsing",
      browsePath,
      updatedAt: new Date(),
    });
    const { browsing } = await import("services/conversation/browsing");
    await browsing(phone, message, { ...conversation, status: "browsing", browsePath });
    return;
  }

  // Category selected from the browse list
  if (message.type === "list_reply" && message.listId?.startsWith("cat-")) {
    const browsePath = [message.listId];
    await db.collection("conversations").doc(cid).update({
      status: "browsing",
      browsePath,
      updatedAt: new Date(),
    });
    const { browsing } = await import("services/conversation/browsing");
    await browsing(phone, message, { ...conversation, status: "browsing", browsePath });
    return;
  }

  // Everything else — show welcome
  await sendWelcome(cid, phone);
}

async function sendWelcome(conversationId: string, phone: string): Promise<void> {
  const popular = popularProducts();

  // Message 1: popular product quick-pick buttons
  await sendButtons(conversationId, phone, WELCOME_BODY,
    popular.map((p) => ({ id: p.id, title: p.label }))
  );

  // Message 2: full category browse list
  await sendList(conversationId, phone, "📂 Browse all categories:", "Browse All", [
    {
      rows: catalog.map((c) => ({
        id: c.id,
        title: c.label,
        description: c.description,
      })),
    },
  ]);
}

export async function initiateFlow(phone: string, conversationId: string, useCase: UseCase): Promise<void> {
  await db.collection("conversations").doc(conversationId).update({
    useCase,
    status: "refining",
    updatedAt: new Date(),
  });

  logger.info("Flow initiated", { phone, useCase });

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
