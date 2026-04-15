import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendList } from "services/whatsapp/sendList";
import { downloadWhatsAppMedia } from "services/whatsapp/getMedia";
import { uploadFile } from "services/storage/uploadFile";
import { callCreativeDirector, CreativeDirectorInput, CreativeDirectorOutput } from "services/llm/creativeDirector";
import { createOrderAndRequestPayment } from "services/conversation/fulfillment";
import { Conversation } from "types/conversation";
import { PendingQuestion } from "config/products/types";
import { t } from "utils/t";

export async function handleDrafting(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;

  // "Create now" → payment
  if (message.type === "button_reply" && message.buttonId === "create_now") {
    await createOrderAndRequestPayment(phone, conversation);
    return;
  }

  // "Add photos" → uploading
  if (message.type === "button_reply" && message.buttonId === "add_photos") {
    await db.collection("conversations").doc(cid).update({
      status: "uploading",
      updatedAt: new Date(),
    });
    await sendText(cid, phone, t("intake.sendImagesNow"));
    return;
  }

  // Image sent directly → auto-attach as reference
  if (message.type === "image" && message.mediaId) {
    logger.info("Drafting: image received", { cid, mediaId: message.mediaId });
    await setProcessing(cid, true);
    try {
      logger.info("Drafting: downloading WhatsApp media", { cid });
      const { buffer, mimeType } = await downloadWhatsAppMedia(message.mediaId);
      logger.info("Drafting: media downloaded, uploading to storage", { cid, size: buffer.length, mimeType });
      const url = await uploadFile(buffer, mimeType ?? "image/jpeg", "reference-images");
      logger.info("Drafting: file uploaded", { cid, url });
      const current = conversation.structuredData.referenceImageUrls ?? [];
      const updated = [...current, url].slice(0, 5);
      await db.collection("conversations").doc(cid).update({
        "structuredData.referenceImageUrls": updated,
        updatedAt: new Date(),
      });
      conversation = {
        ...conversation,
        structuredData: { ...conversation.structuredData, referenceImageUrls: updated },
      };

      const caption = message.text?.trim();
      if (caption) {
        logger.info("Drafting: image with caption, calling Creative Director", { cid });
        const result = await callCreativeDirector(buildDirectorInput(conversation, caption));
        await handleDirectorResult(cid, phone, conversation, result, t("drafting.imageAttached"));
      } else {
        logger.info("Drafting: image without caption, acknowledging", { cid });
        const ud = conversation.unstructuredData;
        if (ud._enrichedPrompt) {
          await sendText(cid, phone, t("drafting.imageAttached"));
          await sendDraftSummary(cid, phone, {
            title: String(ud._title ?? ""),
            enrichedPrompt: String(ud._enrichedPrompt),
            style: String(ud._style ?? ""),
            mood: String(ud._mood ?? ""),
            aspectRatio: String(ud._aspectRatio ?? "1:1"),
          }, updated.length);
        } else {
          await sendText(cid, phone, t("uploading.imageReceived", { count: String(updated.length) }));
          await sendText(cid, phone, t("intake.describePrompt"));
        }
      }
      logger.info("Drafting: image handling complete", { cid });
    } catch (err) {
      logger.error("Drafting image handling failed", { err: (err as Error)?.message ?? String(err), stack: (err as Error)?.stack, cid });
      await sendText(cid, phone, t("errors.generic")).catch(() => undefined);
    } finally {
      await setProcessing(cid, false);
    }
    return;
  }

  // Text / button reply / list reply → map pending question + re-run Creative Director
  const userText = extractUserText(message, conversation);
  if (userText !== null) {
    logger.info("Drafting: text/reply received", { cid, userText: userText.slice(0, 100) });
    await setProcessing(cid, true);
    try {
      if (conversation.pendingQuestion) {
        await db.collection("conversations").doc(cid).update({
          pendingQuestion: null,
          updatedAt: new Date(),
        });
      }

      logger.info("Drafting: calling Creative Director", { cid });
      const result = await callCreativeDirector(buildDirectorInput(conversation, userText));
      logger.info("Drafting: CD returned", { cid, ready: result.ready });
      const prefix = conversation.unstructuredData._enrichedPrompt ? t("drafting.editApplied") : undefined;
      await handleDirectorResult(cid, phone, conversation, result, prefix);
      logger.info("Drafting: text handling complete", { cid });
    } catch (err) {
      logger.error("Drafting text handling failed", { err: (err as Error)?.message ?? String(err), stack: (err as Error)?.stack, cid });
      await sendText(cid, phone, t("errors.generic")).catch(() => undefined);
    } finally {
      await setProcessing(cid, false);
    }
    return;
  }

  // Fallback: re-show current summary or last question
  const ud = conversation.unstructuredData;
  if (ud._enrichedPrompt) {
    await sendDraftSummary(cid, phone, {
      title: String(ud._title ?? ""),
      enrichedPrompt: String(ud._enrichedPrompt),
      style: String(ud._style ?? ""),
      mood: String(ud._mood ?? ""),
      aspectRatio: String(ud._aspectRatio ?? "1:1"),
    }, conversation.structuredData.referenceImageUrls?.length ?? 0);
  } else {
    await sendText(cid, phone, t("intake.describePrompt"));
  }
}

/** Extract user's text response, accounting for pending question type */
function extractUserText(message: ParsedMessage, conversation: Conversation): string | null {
  if (message.type === "text" && message.text?.trim()) {
    return message.text.trim();
  }
  if (message.type === "button_reply" && message.buttonId) {
    return message.text ?? message.buttonId;
  }
  if (message.type === "list_reply" && message.listId) {
    return message.text ?? message.listId;
  }
  return null;
}

function buildDirectorInput(conversation: Conversation, userMessage: string): CreativeDirectorInput {
  const ud = conversation.unstructuredData;
  const history = (conversation.messageHistory ?? []).slice(-10);
  const hasPreviousDraft = !!ud._enrichedPrompt;

  return {
    userMessage,
    history,
    referenceImageCount: conversation.structuredData.referenceImageUrls?.length ?? 0,
    outputType: conversation.structuredData.outputType ?? "image",
    previousDraft: hasPreviousDraft ? {
      title: String(ud._title ?? ""),
      enrichedPrompt: String(ud._enrichedPrompt ?? ""),
      style: String(ud._style ?? ""),
      mood: String(ud._mood ?? ""),
      aspectRatio: String(ud._aspectRatio ?? "1:1"),
    } : undefined,
  };
}

async function handleDirectorResult(
  cid: string,
  phone: string,
  conversation: Conversation,
  result: CreativeDirectorOutput,
  prefixMessage?: string
): Promise<void> {
  if (result.ready) {
    await persistDraft(cid, result);
    if (prefixMessage) {
      await sendText(cid, phone, prefixMessage);
    }
    await sendDraftSummary(cid, phone, result, conversation.structuredData.referenceImageUrls?.length ?? 0);
  } else {
    await dispatchQuestion(cid, phone, result.question);
  }
}

async function persistDraft(
  cid: string,
  draft: { title: string; enrichedPrompt: string; style: string; mood: string; aspectRatio: string }
): Promise<void> {
  await db.collection("conversations").doc(cid).update({
    "structuredData.aspectRatio": draft.aspectRatio,
    "unstructuredData._title": draft.title,
    "unstructuredData._enrichedPrompt": draft.enrichedPrompt,
    "unstructuredData._style": draft.style,
    "unstructuredData._mood": draft.mood,
    "unstructuredData._aspectRatio": draft.aspectRatio,
    pendingQuestion: null,
    updatedAt: new Date(),
  });
}

/**
 * WhatsApp interactive button messages have a 1024-char body limit.
 * If the summary exceeds that, send the brief as plain text first,
 * then send the action buttons separately.
 */
export async function sendDraftSummary(
  cid: string,
  phone: string,
  draft: { title: string; enrichedPrompt: string; style: string; mood: string; aspectRatio: string },
  referenceCount: number
): Promise<void> {
  const refLine = referenceCount > 0 ? `\n📎 ${referenceCount} reference image(s)` : "";
  const briefText = `✨ *${draft.title}*\n\n${draft.enrichedPrompt}\n\n📐 ${draft.aspectRatio} • 🎨 ${draft.style} • ${draft.mood}${refLine}`;
  const ctaLine = "\n\nTap *Create now* to generate, or just tell me what to change.";

  const buttons = [
    { id: "create_now", title: t("drafting.createButton") },
    { id: "add_photos", title: t("drafting.addPhotosButton") },
  ];

  const fullSummary = briefText + ctaLine;

  if (fullSummary.length <= 1024) {
    await sendButtons(cid, phone, fullSummary, buttons);
  } else {
    // Split: send the creative brief as text, then buttons with short CTA
    await sendText(cid, phone, briefText);
    await sendButtons(cid, phone, "What would you like to do?", buttons);
  }
}

async function dispatchQuestion(
  cid: string,
  phone: string,
  question: { text: string; type: "buttons" | "list" | "text"; options?: { id: string; label: string }[] }
): Promise<void> {
  const pending: PendingQuestion = { key: "_lastAnswer", type: question.type === "buttons" ? "boolean" : question.type };
  await db.collection("conversations").doc(cid).update({
    pendingQuestion: pending,
    updatedAt: new Date(),
  });

  if (question.type === "buttons" && question.options?.length) {
    await sendButtons(cid, phone, question.text,
      question.options.slice(0, 3).map((o) => ({ id: o.id, title: o.label }))
    );
  } else if (question.type === "list" && question.options?.length) {
    await sendList(cid, phone, question.text, "Choose", [{
      rows: question.options.map((o) => ({ id: o.id, title: o.label })),
    }]);
  } else {
    await sendText(cid, phone, question.text);
  }
}

async function setProcessing(cid: string, value: boolean): Promise<void> {
  await db.collection("conversations").doc(cid).update({
    processing: value,
    updatedAt: new Date(),
  }).catch((err) => logger.warn("Failed to set processing flag", { err, cid, value }));
}
