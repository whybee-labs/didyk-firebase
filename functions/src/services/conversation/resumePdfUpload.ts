import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { downloadWhatsAppMedia } from "services/whatsapp/getMedia";
import { parseResumeFromPdf, formatResumeSummaryFull } from "services/resume/parseResumePdf";
import { Conversation } from "./handleIncomingMessage";
import { t } from "utils/t";

/** Recursively replace undefined with null so Firestore accepts the object. */
function forFirestore(obj: unknown): unknown {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(forFirestore);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = forFirestore(v);
  }
  return out;
}

/**
 * When user is in waiting_for_pdf and sends a document: download, parse, prefill collectedData, send summary, enter refining.
 */
export async function handleResumePdfUpload(
  phone: string,
  mediaId: string,
  conversation: Conversation
): Promise<void> {
  const cid = conversation.conversationId;

  let buffer: Buffer;
  let mimeType: string;
  try {
    const result = await downloadWhatsAppMedia(mediaId);
    buffer = result.buffer;
    mimeType = result.mimeType || "";
  } catch (err) {
    logger.warn("Resume PDF: failed to download document", { err, mediaId });
    await sendText(cid, phone, t("errors.generic"));
    return;
  }

  if (!mimeType.toLowerCase().includes("pdf")) {
    await sendText(cid, phone, t("errors.pdfNotDocument"));
    return;
  }

  let collectedData: Record<string, unknown>;
  try {
    collectedData = await parseResumeFromPdf(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("Resume PDF: parse failed", { message, stack: err instanceof Error ? err.stack : undefined });
    await sendText(cid, phone, t("errors.pdfParseFailed"));
    return;
  }

  await db.collection("conversations").doc(cid).update({
    collectedData: forFirestore(collectedData) as Record<string, unknown>,
    status: "refining",
    messageHistory: [],
    updatedAt: new Date(),
  });

  const summaryFull = formatResumeSummaryFull(collectedData);
  await sendText(cid, phone, `${summaryFull}\n\n${t("resume.upload.parsed")}`);
}
