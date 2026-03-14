import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { sendCTAButton } from "services/whatsapp/sendCTAButton";
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

export async function startFulfillment(phone: string, conversation: Conversation): Promise<void> {
  logger.info("Fulfillment started", { phone, conversationId: conversation.conversationId, useCase: conversation.useCase });

  await db.collection("conversations").doc(conversation.conversationId).update({
    status: "generating",
    updatedAt: new Date(),
  });

  const config = getProductConfig(conversation.useCase as UseCase);
  const cid = conversation.conversationId;
  const isResume = conversation.useCase === "resume";

  const dataForGenerate = { ...conversation.collectedData };
  if (isResume && dataForGenerate.firstName != null && dataForGenerate.lastName != null && !dataForGenerate.fullName) {
    dataForGenerate.fullName = [dataForGenerate.firstName, dataForGenerate.lastName].join(" ").trim();
  }
  if (isResume && conversation.selectedPrimaryColor) {
    const ucId = conversation.selectedUseCaseIds?.[0];
    const templateKey = ucId ? templateKeyFromUseCaseId(ucId) : "";
    const colorConfig = getResumeColorConfig(templateKey);
    const hex = conversation.selectedPrimaryColor;
    if (colorConfig?.mode === "background") {
      dataForGenerate.backgroundColor = hex;
      dataForGenerate.primaryColor = textColorForBackground(hex);
    } else {
      dataForGenerate.primaryColor = hex;
    }
  }

  if (!isResume) {
    await sendText(cid, phone, t("fulfillment.preview"));
    for (const ucId of conversation.selectedUseCaseIds ?? []) {
      const uc = findUseCase(ucId);
      if (!uc?.outputs) continue;
      for (const output of uc.outputs) {
        const result = await output.generate({ ...dataForGenerate, _phone: phone, _conversationId: cid });
        await dispatchOutput(cid, phone, output.type, result);
      }
    }
  } else {
    // Resume: send preview PDF (with watermark) then payment CTA
    await sendText(cid, phone, t("fulfillment.previewResume"));
    const ucId = conversation.selectedUseCaseIds?.[0];
    const uc = ucId ? findUseCase(ucId) : null;
    if (uc?.outputs) {
      for (const output of uc.outputs) {
        const result = await output.generate({
          ...dataForGenerate,
          _phone: phone,
          _conversationId: cid,
          _watermark: true,
        });
        await dispatchOutput(cid, phone, output.type, result, "resume_preview.pdf");
      }
    }
  }

  // Detect currency from phone country code (+91 = India = INR, everything else = USD)
  const currency   = phone.startsWith("91") ? "INR" : "USD";
  const symbol     = currency === "INR" ? "₹" : "$";
  const selectedUc = findUseCase(conversation.selectedUseCaseIds?.[0] ?? "");
  const amount     = selectedUc?.pricing[currency] ?? 0;

  // Create Razorpay payment link and send to user
  const { id, shortUrl } = await createPaymentLink(phone, cid, amount, `Whybee ${config.name}`, currency);

  await sendCTAButton(cid, phone, t("fulfillment.payment"), t("fulfillment.paymentButton", { symbol, amount: String(amount) }), shortUrl);

  await db.collection("conversations").doc(cid).update({
    status: "awaiting_payment",
    paymentData: { linkId: id, amount, currency, createdAt: new Date() },
    updatedAt: new Date(),
  });
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
