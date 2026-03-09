import { FieldValue } from "firebase-admin/firestore";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { sendList } from "services/whatsapp/sendList";
import { findCategory, findProduct, findUseCase } from "config/catalog";
import { Conversation } from "services/conversation/handleIncomingMessage";
import { initiateFlow } from "services/conversation/discovery";

export async function browsing(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;

  // Non-list replies just re-render the current catalog level
  if (message.type !== "list_reply" || !message.listId) {
    await sendCurrentLevel(cid, phone, conversation.browsePath ?? []);
    return;
  }

  const id = message.listId;

  // Use case selected?
  const uc = findUseCase(id);
  if (uc) {
    const browsePath = conversation.browsePath ?? [];
    const prodId = [...browsePath].reverse().find((s) => s.startsWith("prod-"));
    const product = prodId ? findProduct(prodId) : null;

    if (uc.outputs && uc.outputs.length > 0 && product?.productConfigId) {
      await db.collection("conversations").doc(cid).update({
        selectedUseCaseIds: [id],
        updatedAt: new Date(),
      });
      await initiateFlow(phone, cid, product.productConfigId);
    } else {
      await sendText(cid, phone, "🔜 Coming soon! We're working hard on this one. Check back later!");
      await resetToDiscovery(phone, cid, conversation);
    }
    return;
  }

  // Product selected?
  const product = findProduct(id);
  if (product) {
    const browsePath = [...(conversation.browsePath ?? [])];
    if (!browsePath.includes(id)) browsePath.push(id);
    await db.collection("conversations").doc(cid).update({
      browsePath,
      updatedAt: new Date(),
    });
    await sendCurrentLevel(cid, phone, browsePath);
    return;
  }

  // Category selected?
  const category = findCategory(id);
  if (category) {
    const browsePath = [id];
    await db.collection("conversations").doc(cid).update({
      status: "browsing",
      browsePath,
      updatedAt: new Date(),
    });
    await sendCurrentLevel(cid, phone, browsePath);
    return;
  }

  // Unknown ID — re-render current level
  await sendCurrentLevel(cid, phone, conversation.browsePath ?? []);
}

async function sendCurrentLevel(conversationId: string, phone: string, browsePath: string[]): Promise<void> {
  const last = browsePath[browsePath.length - 1];

  if (!last || last.startsWith("cat-")) {
    const category = last ? findCategory(last) : null;
    if (category) {
      await sendList(conversationId, phone, `📂 *${category.label}*\nChoose a product:`, "Browse", [
        {
          rows: category.products.map((p) => ({
            id: p.id,
            title: p.label,
            description: p.description,
          })),
        },
      ]);
      return;
    }
  }

  if (last?.startsWith("prod-")) {
    const product = findProduct(last);
    if (product) {
      await sendList(conversationId, phone, `📦 *${product.label}*\nWhat would you like created?`, "Choose", [
        {
          rows: product.useCases.map((uc) => ({
            id: uc.id,
            title: uc.label,
            description: uc.description,
          })),
        },
      ]);
      return;
    }
  }

  // Fallback — resend category browse list
  const { catalog } = await import("config/catalog");
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

async function resetToDiscovery(phone: string, conversationId: string, conversation: Conversation): Promise<void> {
  await db.collection("conversations").doc(conversationId).update({
    status: "discovery",
    useCase: FieldValue.delete(),
    browsePath: FieldValue.delete(),
    selectedUseCaseIds: FieldValue.delete(),
    collectedData: {},
    updatedAt: new Date(),
  });

  const { discovery } = await import("services/conversation/discovery");
  await discovery(phone, { type: "text", phone, messageId: "", timestamp: "" }, {
    ...conversation,
    status: "discovery",
    useCase: undefined,
    collectedData: {},
    browsePath: undefined,
    selectedUseCaseIds: undefined,
  });
}
