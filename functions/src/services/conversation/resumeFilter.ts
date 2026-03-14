import { sendImage } from "services/whatsapp/sendImage";
import { sendList } from "services/whatsapp/sendList";
import { findProduct, LIVE_PRODUCT_ID } from "config/catalog";
import { RESUME_SAMPLE_IMAGE_URLS } from "config/resumeSampleImages";
import { t } from "utils/t";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LAG_AFTER_IMAGE_MS = 2200;

/**
 * Send (1) one image with caption, then (2) the template list. Total 2 messages.
 * Caller must set status to selecting_usecases.
 */
export async function sendResumeSamplesAndList(conversationId: string, phone: string): Promise<void> {
  const product = findProduct(LIVE_PRODUCT_ID);
  if (!product?.useCases?.length) {
    return;
  }

  // 1. Image with caption (so user sees templates and instruction in one message)
  const imageCaption = t("resume.samples.introBeforeList");
  if (RESUME_SAMPLE_IMAGE_URLS.length > 0) {
    try {
      await sendImage(conversationId, phone, RESUME_SAMPLE_IMAGE_URLS[0], imageCaption);
      await delay(LAG_AFTER_IMAGE_MS);
    } catch (err) {
      // Log but continue so user at least gets the list
      const { logger } = await import("firebase-functions");
      logger.warn("Resume sample image send failed", { err, url: RESUME_SAMPLE_IMAGE_URLS[0] });
    }
  }

  // 2. List: "Amazing! Pick the style you'd love for your Resume 👇🏻" with Choose button
  const currency = phone.startsWith("91") ? "INR" : "USD";
  const symbol = currency === "INR" ? "₹" : "$";
  const rows = product.useCases.map((uc) => ({ id: uc.id, title: uc.label, description: `${uc.description} · ${symbol}${uc.pricing[currency]}` }));
  const ROWS_PER_SECTION = 10;
  const sections: { title: string; rows: typeof rows }[] = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_SECTION) {
    const chunk = rows.slice(i, i + ROWS_PER_SECTION);
    const title = sections.length === 0 ? "Pick a template" : "More options";
    sections.push({ title: title.slice(0, 24), rows: chunk });
  }
  await sendList(
    conversationId,
    phone,
    t("usecase.bodyResumeAfterImages"),
    t("usecase.button"),
    sections
  );
}
