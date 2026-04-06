import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendText } from "services/whatsapp/sendText";
import { sendList } from "services/whatsapp/sendList";
import { downloadWhatsAppMedia } from "services/whatsapp/getMedia";
import { uploadFile } from "services/storage/uploadFile";
import { callCreativeDirector } from "services/llm/creativeDirector";
import { OutputType } from "config/products/types";
import { Conversation } from "types/conversation";
import { sendDraftSummary } from "services/conversation/drafting";
import { t } from "utils/t";

const RESET_WORDS = ["hi", "reset", "start over", "restart"];

export async function handleIntake(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;
  const sd = conversation.structuredData;

  // Step 1: No output type yet — show Image/Video/Audio buttons
  if (!sd.outputType) {
    if (message.type === "button_reply" && message.buttonId &&
        ["image", "video", "audio"].includes(message.buttonId)) {
      await db.collection("conversations").doc(cid).update({
        "structuredData.outputType": message.buttonId as OutputType,
        updatedAt: new Date(),
      });
      await sendText(cid, phone, t("intake.describePrompt"));
      return;
    }
    await sendWelcome(cid, phone);
    return;
  }

  // Step 2: Output type selected — waiting for user's description

  // Reset words after output type selection → just re-show welcome
  const txt = message.type === "text" ? message.text?.toLowerCase().trim() : "";
  if (txt && RESET_WORDS.includes(txt)) {
    await sendWelcome(cid, phone);
    return;
  }

  // Image sent without text → store reference, ask what to create
  if (message.type === "image" && message.mediaId && !message.text?.trim()) {
    await setProcessing(cid, true);
    try {
      const { buffer, mimeType } = await downloadWhatsAppMedia(message.mediaId);
      const url = await uploadFile(buffer, mimeType ?? "image/jpeg", "reference-images");
      const updated = [...(sd.referenceImageUrls ?? []), url].slice(0, 5);
      await db.collection("conversations").doc(cid).update({
        "structuredData.referenceImageUrls": updated,
        updatedAt: new Date(),
      });
      await sendText(cid, phone, t("intake.imageOnly"));
    } catch (err) {
      logger.error("Image upload failed in intake", { err });
      await sendText(cid, phone, t("errors.imageUploadFailed"));
    } finally {
      await setProcessing(cid, false);
    }
    return;
  }

  // Image with caption → store reference + call Creative Director
  if (message.type === "image" && message.mediaId && message.text?.trim()) {
    await setProcessing(cid, true);
    try {
      const { buffer, mimeType } = await downloadWhatsAppMedia(message.mediaId);
      const url = await uploadFile(buffer, mimeType ?? "image/jpeg", "reference-images");
      const updated = [...(sd.referenceImageUrls ?? []), url].slice(0, 5);
      await db.collection("conversations").doc(cid).update({
        "structuredData.referenceImageUrls": updated,
        updatedAt: new Date(),
      });
      conversation = {
        ...conversation,
        structuredData: { ...sd, referenceImageUrls: updated },
      };
      // Fall through to Creative Director call below
    } catch (err) {
      logger.error("Image upload failed in intake", { err });
      await sendText(cid, phone, t("errors.imageUploadFailed"));
      await setProcessing(cid, false);
      return;
    }
  } else {
    // Regular text message → set processing
    await setProcessing(cid, true);
  }

  // Call Creative Director
  const userText = message.text?.trim();
  if (!userText) {
    await setProcessing(cid, false);
    await sendText(cid, phone, t("intake.describePrompt"));
    return;
  }

  try {
    const history = (conversation.messageHistory ?? []).slice(-10);
    const result = await callCreativeDirector({
      userMessage: userText,
      history,
      referenceImageCount: conversation.structuredData.referenceImageUrls?.length ?? 0,
      outputType: conversation.structuredData.outputType!,
    });

    // Transition to drafting
    await db.collection("conversations").doc(cid).update({
      status: "drafting",
      updatedAt: new Date(),
    });

    if (result.ready) {
      await db.collection("conversations").doc(cid).update({
        "structuredData.aspectRatio": result.aspectRatio,
        "unstructuredData._title": result.title,
        "unstructuredData._enrichedPrompt": result.enrichedPrompt,
        "unstructuredData._style": result.style,
        "unstructuredData._mood": result.mood,
        "unstructuredData._aspectRatio": result.aspectRatio,
      });
      await sendDraftSummary(
        cid, phone, result,
        conversation.structuredData.referenceImageUrls?.length ?? 0
      );
    } else {
      // Creative Director needs more info — ask question from drafting state
      const q = result.question;
      await db.collection("conversations").doc(cid).update({
        pendingQuestion: { key: "_lastAnswer", type: q.type === "buttons" ? "boolean" : q.type },
      });

      if (q.type === "buttons" && q.options?.length) {
        await sendButtons(cid, phone, q.text,
          q.options.slice(0, 3).map((o) => ({ id: o.id, title: o.label }))
        );
      } else if (q.type === "list" && q.options?.length) {
        await sendList(cid, phone, q.text, "Choose", [{
          rows: q.options.map((o) => ({ id: o.id, title: o.label })),
        }]);
      } else {
        await sendText(cid, phone, q.text);
      }
    }
  } catch (err) {
    logger.error("Creative Director call failed in intake", { err });
    await sendText(cid, phone, t("errors.generic"));
  } finally {
    await setProcessing(cid, false);
  }
}

async function sendWelcome(cid: string, phone: string): Promise<void> {
  await sendButtons(cid, phone, t("welcome.body"), [
    { id: "image", title: t("welcome.button.image") },
    { id: "video", title: t("welcome.button.video") },
    { id: "audio", title: t("welcome.button.audio") },
  ]);
}

async function setProcessing(cid: string, value: boolean): Promise<void> {
  await db.collection("conversations").doc(cid).update({
    processing: value,
    updatedAt: new Date(),
  }).catch((err) => logger.warn("Failed to set processing flag", { err, cid, value }));
}
