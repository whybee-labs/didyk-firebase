import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { sendVideo } from "services/whatsapp/sendVideo";
import { sendImage } from "services/whatsapp/sendImage";
import { sendDocument } from "services/whatsapp/sendDocument";
import { sendAudio } from "services/whatsapp/sendAudio";
import { getProductConfig, UseCase } from "config/products";
import { OutputType } from "config/products/types";
import { findUseCase } from "config/catalog";
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

  await sendText(cid, phone, t("fulfillment.preview"));

  // Generate and send outputs for each selected use case
  for (const ucId of conversation.selectedUseCaseIds ?? []) {
    const uc = findUseCase(ucId);
    if (!uc?.outputs) continue;
    for (const output of uc.outputs) {
      const result = await output.generate(conversation.collectedData);
      await dispatchOutput(cid, phone, output.type, result);
    }
  }

  // Create Razorpay payment link and send to user
  const { id, shortUrl } = await createPaymentLink(
    phone,
    cid,
    config.pricing.amount,
    `Whybee ${config.name}`
  );

  await sendText(cid, phone, t("fulfillment.payment", { url: shortUrl }));

  await db.collection("conversations").doc(cid).update({
    status: "awaiting_payment",
    "collectedData.paymentLinkId": id,
    updatedAt: new Date(),
  });
}

async function dispatchOutput(conversationId: string, phone: string, type: OutputType, value: string): Promise<void> {
  switch (type) {
    case "video":    return sendVideo(conversationId, phone, value);
    case "image":    return sendImage(conversationId, phone, value);
    case "pdf":      return sendDocument(conversationId, phone, value, "whybee.pdf");
    case "audio":    return sendAudio(conversationId, phone, value);
    case "text":     return sendText(conversationId, phone, value);
  }
}
