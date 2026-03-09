import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendList } from "services/whatsapp/sendList";
import { catalog, findCategory, findProduct } from "config/catalog";
import { Conversation } from "services/conversation/handleIncomingMessage";
import { initiateFlow } from "services/conversation/discovery";
import { t } from "utils/t";

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

  // Product selected — go straight to form (refining)
  const product = findProduct(id);
  if (product?.productConfigId) {
    const browsePath = [...(conversation.browsePath ?? [])];
    if (!browsePath.includes(id)) browsePath.push(id);
    await db.collection("conversations").doc(cid).update({
      browsePath,
      updatedAt: new Date(),
    });
    await initiateFlow(phone, cid, product.productConfigId, browsePath);
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

  if (last?.startsWith("cat-")) {
    const category = findCategory(last);
    if (category) {
      await sendList(conversationId, phone, t("browse.category.header", { label: category.label }), t("browse.category.button"), [
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
      await sendList(conversationId, phone, t("browse.product.header", { label: product.label }), t("browse.product.button"), [
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

  // Fallback — top-level category list
  await sendList(conversationId, phone, t("welcome.browseAll.body"), t("welcome.browseAll.button"), [
    {
      rows: catalog.map((c) => ({
        id: c.id,
        title: c.label,
        description: c.description,
      })),
    },
  ]);
}
