import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { sendCTAButton } from "services/whatsapp/sendCTAButton";
import { sendButtons } from "services/whatsapp/sendButtons";
import { sendVideo } from "services/whatsapp/sendVideo";
import { sendImage } from "services/whatsapp/sendImage";
import { sendDocument } from "services/whatsapp/sendDocument";
import { sendAudio } from "services/whatsapp/sendAudio";
import { getProductConfig, UseCase } from "config/products";
import { OutputType } from "config/products/types";
import { findUseCase } from "config/catalog";
import { templateKeyFromUseCaseId, getResumeColorConfig, textColorForBackground } from "config/resumeColors";
import { createPaymentLink } from "services/payment/createPaymentLink";
import { Conversation } from "services/conversation/handleIncomingMessage";
import { t } from "utils/t";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PREVIEW_BUTTONS_DELAY_MS = 4000;

export async function startFulfillment(phone: string, conversation: Conversation): Promise<void> {
  logger.info("Fulfillment started", { phone, conversationId: conversation.conversationId, useCase: conversation.useCase });

  await db.collection("conversations").doc(conversation.conversationId).update({
    status: "generating",
    updatedAt: new Date(),
  });

  const config = getProductConfig(conversation.useCase as UseCase);
  const cid = conversation.conversationId;
  const isResume = conversation.useCase === "resume";

  if (!isResume) {
    const dataForGenerate = { ...conversation.collectedData };
    await sendText(cid, phone, t("fulfillment.preview"));
    for (const ucId of conversation.selectedUseCaseIds ?? []) {
      const uc = findUseCase(ucId);
      if (!uc?.outputs) continue;
      for (const output of uc.outputs) {
        const result = await output.generate({ ...dataForGenerate, _phone: phone, _conversationId: cid });
        await dispatchOutput(cid, phone, output.type, result);
      }
    }

    // Non-resume: go straight to payment
    const currency   = phone.startsWith("91") ? "INR" : "USD";
    const symbol     = currency === "INR" ? "₹" : "$";
    const selectedUc = findUseCase(conversation.selectedUseCaseIds?.[0] ?? "");
    const amount     = selectedUc?.pricing[currency] ?? 0;
    const { id, shortUrl } = await createPaymentLink(phone, cid, amount, `Whybee ${config.name}`, currency);
    await sendCTAButton(cid, phone, t("fulfillment.payment"), t("fulfillment.paymentButton", { symbol, amount: String(amount) }), shortUrl);
    await db.collection("conversations").doc(cid).update({
      status: "awaiting_payment",
      paymentData: { linkId: id, amount, currency, createdAt: new Date() },
      updatedAt: new Date(),
    });
  } else {
    // Resume: send preview PDF (with watermark) then 3-button prompt
    await sendText(cid, phone, t("fulfillment.previewResume"));
    await generateAndSendResume(phone, cid, conversation.collectedData, conversation.selectedUseCaseIds, conversation.selectedPrimaryColor, true);

    // Wait for user to see the preview before showing action buttons
    await delay(PREVIEW_BUTTONS_DELAY_MS);

    // Send 3 buttons: Get Final / Change Template / Edit Details
    await sendButtons(cid, phone, t("fulfillment.previewPrompt"), [
      { id: "generate_final", title: t("fulfillment.previewGetFinal") },
      { id: "change_template", title: t("fulfillment.previewChangeTemplate") },
      { id: "edit_details", title: t("fulfillment.previewEditDetails") },
    ]);

    await db.collection("conversations").doc(cid).update({
      status: "reviewing_preview",
      updatedAt: new Date(),
    });
  }
}

/**
 * Single function for generating + sending resume outputs.
 * Both preview (watermark=true) and final (watermark=false) call this,
 * so colour, sections, and filename are always identical.
 */
export async function generateAndSendResume(
  phone: string,
  cid: string,
  collectedData: Record<string, unknown>,
  selectedUseCaseIds: string[] | undefined,
  selectedPrimaryColor: string | undefined,
  watermark: boolean,
): Promise<number> {
  const data = { ...collectedData };

  // Derive fullName
  if (data.firstName != null && data.lastName != null && !data.fullName) {
    data.fullName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
  }

  // Compute colour
  const ucId = selectedUseCaseIds?.[0];
  if (selectedPrimaryColor && ucId) {
    const templateKey = templateKeyFromUseCaseId(ucId);
    const colorConfig = getResumeColorConfig(templateKey);
    if (colorConfig?.mode === "background") {
      data.backgroundColor = selectedPrimaryColor;
      data.primaryColor = textColorForBackground(selectedPrimaryColor);
    } else {
      data.primaryColor = selectedPrimaryColor;
    }
  }

  const suffix = watermark ? "preview" : "resume";
  const filename = `${sanitizeResumeFilename(data.fullName)}_${suffix}.pdf`;

  let dispatched = 0;
  if (ucId) {
    const uc = findUseCase(ucId);
    if (uc?.outputs) {
      for (const output of uc.outputs) {
        const result = await output.generate({
          ...data,
          _phone: phone,
          _conversationId: cid,
          _watermark: watermark,
        });
        await dispatchOutput(cid, phone, output.type, result, filename);
        dispatched++;
      }
    } else {
      logger.error("Resume use case not found or has no outputs", { ucId });
    }
  }

  return dispatched;
}

function sanitizeResumeFilename(fullName: unknown): string {
  if (fullName == null || typeof fullName !== "string") return "resume";
  const s = fullName.trim().replace(/\s+/g, "_").replace(/[/\\:*?"<>|]/g, "");
  return (s || "resume").slice(0, 80);
}

async function dispatchOutput(
  conversationId: string,
  phone: string,
  type: OutputType,
  value: string,
  documentFilename?: string
): Promise<void> {
  switch (type) {
    case "video":  return sendVideo(conversationId, phone, value);
    case "image":  return sendImage(conversationId, phone, value);
    case "pdf":    return sendDocument(conversationId, phone, value, documentFilename ?? "whybee.pdf");
    case "audio":  return sendAudio(conversationId, phone, value);
    case "text":   return sendText(conversationId, phone, value);
  }
}
