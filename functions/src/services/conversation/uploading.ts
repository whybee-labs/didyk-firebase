import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { sendButtons } from "services/whatsapp/sendButtons";
import { downloadWhatsAppMedia } from "services/whatsapp/getMedia";
import { uploadFile } from "services/storage/uploadFile";
import { Conversation } from "types/conversation";
import { handleDrafting } from "services/conversation/drafting";
import { t } from "utils/t";

const MAX_IMAGES = 5;

export async function handleUploading(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;
  const current = conversation.structuredData.referenceImageUrls ?? [];

  if (message.type === "image" && message.mediaId) {
    await setProcessing(cid, true);
    try {
      const { buffer, mimeType } = await downloadWhatsAppMedia(message.mediaId);
      const url = await uploadFile(buffer, mimeType ?? "image/jpeg", "reference-images");

      const updated = [...current, url].slice(0, MAX_IMAGES);
      await db.collection("conversations").doc(cid).update({
        "structuredData.referenceImageUrls": updated,
        updatedAt: new Date(),
      });

      const remaining = MAX_IMAGES - updated.length;
      if (remaining > 0) {
        await sendButtons(cid, phone, t("uploading.imageReceived", { count: String(updated.length) }), [
          { id: "upload_done", title: t("uploading.done") },
          ...(remaining > 0 ? [{ id: "upload_more", title: t("uploading.sendMore") }] : []),
        ]);
      } else {
        await proceedToDrafting(cid, phone, {
          ...conversation,
          structuredData: { ...conversation.structuredData, referenceImageUrls: updated },
        });
      }
    } catch (err) {
      logger.error("Image upload failed", { err });
      await sendText(cid, phone, t("errors.imageUploadFailed"));
    } finally {
      await setProcessing(cid, false);
    }
    return;
  }

  // User tapped "Done" or sent text — proceed to drafting
  if (
    (message.type === "button_reply" && message.buttonId === "upload_done") ||
    (message.type === "text")
  ) {
    await proceedToDrafting(cid, phone, conversation);
    return;
  }

  await sendText(cid, phone, t("uploading.prompt"));
}

async function proceedToDrafting(cid: string, phone: string, conversation: Conversation): Promise<void> {
  await db.collection("conversations").doc(cid).update({
    status: "drafting",
    updatedAt: new Date(),
  });
  await handleDrafting(phone, { type: "text", text: "" } as ParsedMessage, {
    ...conversation,
    status: "drafting",
  });
}

async function setProcessing(cid: string, value: boolean): Promise<void> {
  await db.collection("conversations").doc(cid).update({
    processing: value,
    updatedAt: new Date(),
  }).catch((err) => logger.warn("Failed to set processing flag", { err, cid, value }));
}
