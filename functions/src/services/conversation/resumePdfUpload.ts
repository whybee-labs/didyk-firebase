import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { downloadWhatsAppMedia } from "services/whatsapp/getMedia";
import {
  parseResumeFromPdf,
  formatResumeSummaryProfile,
  formatResumeSummaryExperience,
  formatResumeSummaryProjects,
  formatResumeSummaryOptional,
} from "services/resume/parseResumePdf";
import { callOpenAI } from "services/llm/openai";
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

export async function sendResumeSectionsForReview(
  cid: string,
  phone: string,
  collectedData: Record<string, unknown>
): Promise<void> {
  // Auto-generate summary if missing
  if (!collectedData.summary || !String(collectedData.summary).trim()) {
    try {
      const generated = await generateSummary(collectedData);
      if (generated) {
        collectedData.summary = generated;
        await db.collection("conversations").doc(cid).update({
          "collectedData.summary": generated,
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      logger.warn("Auto-generate summary failed", { err });
    }
  }

  const profile = formatResumeSummaryProfile(collectedData);
  const experience = formatResumeSummaryExperience(collectedData);
  const projects = formatResumeSummaryProjects(collectedData);
  const optional = formatResumeSummaryOptional(collectedData);

  await sendText(cid, phone, profile);
  await sendText(cid, phone, experience);
  await sendText(cid, phone, projects);
  await sendText(cid, phone, optional);

  await sendText(cid, phone, t("resume.review.prompt"));
}

async function generateSummary(data: Record<string, unknown>): Promise<string | null> {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || "";
  const role = (data.targetRole as string) || "";
  const skills = Array.isArray(data.skills) ? data.skills.join(", ") : "";
  const expCount = Array.isArray(data.experience) ? data.experience.length : 0;
  const projCount = Array.isArray(data.projects) ? data.projects.length : 0;

  const context = [
    name && `Name: ${name}`,
    role && `Target role: ${role}`,
    skills && `Skills: ${skills}`,
    expCount && `${expCount} work experience(s)`,
    projCount && `${projCount} project(s)`,
  ].filter(Boolean).join(". ");

  if (!context) return null;

  const prompt = `Write a professional 2-3 sentence resume summary for this person. Be concise, confident, and specific. Do NOT use generic filler. Output ONLY the summary text, nothing else.\n\n${context}`;
  const result = await callOpenAI(prompt, "", true);
  const trimmed = result.trim().replace(/^["']|["']$/g, "");
  return trimmed || null;
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
    updatedAt: new Date(),
  });

  const { advanceResumeFlow } = await import("services/conversation/resumeFlowRouter");
  await advanceResumeFlow(phone, { ...conversation, collectedData });
}
