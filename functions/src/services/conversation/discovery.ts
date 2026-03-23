import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendText } from "services/whatsapp/sendText";
import { findProduct, LIVE_PRODUCT_ID, popularProducts } from "config/catalog";
import { UseCase } from "config/products";
import { Conversation } from "services/conversation/handleIncomingMessage";
import { t, TranslationKey } from "utils/t";

export async function discovery(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;

  // Popular product button tapped — only Resume is live; others show "Coming soon"
  if (message.type === "button_reply" && message.buttonId?.startsWith("prod-")) {
    const prodId = message.buttonId;
    const product = findProduct(prodId);
    if (prodId !== LIVE_PRODUCT_ID) {
      await sendText(cid, phone, t("comingSoon"));
      await sendWelcome(cid, phone);
      return;
    }
    if (product?.productConfigId) {
      await db.collection("conversations").doc(cid).update({
        useCase: "resume",
        browsePath: [prodId],
        status: "selecting_usecases",
        updatedAt: new Date(),
      });
      const { sendResumeSamplesAndList } = await import("services/conversation/resumeFilter");
      await sendResumeSamplesAndList(cid, phone);
    } else {
      await sendWelcome(cid, phone);
    }
    return;
  }

  // Category selected from the browse list — enter browsing state
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
  const popular = popularProducts().slice(0, 3); // WhatsApp max 3 buttons
  // Resume first, then others
  const ordered = [...popular].sort((a, b) =>
    a.id === LIVE_PRODUCT_ID ? -1 : b.id === LIVE_PRODUCT_ID ? 1 : 0
  );

  await sendButtons(conversationId, phone, t("welcome.body"),
    ordered.map((p) => ({ id: p.id, title: t(`welcome.button.${p.id}` as TranslationKey) }))
  );
}

export async function initiateFlow(
  phone: string,
  conversationId: string,
  useCase: UseCase,
  browsePath?: string[]
): Promise<void> {
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
    browsePath,
    lastMessageAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await flowEngine(phone, { type: "text", phone, messageId: "", timestamp: "", text: "" }, syntheticConversation);
}
