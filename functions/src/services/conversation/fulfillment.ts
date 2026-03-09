import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { sendVideo } from "services/whatsapp/sendVideo";
import { sendImage } from "services/whatsapp/sendImage";
import { sendDocument } from "services/whatsapp/sendDocument";
import { sendAudio } from "services/whatsapp/sendAudio";
import { getFlowConfig, UseCase } from "config/flows";
import { OutputType } from "config/flows/types";
import { createPaymentLink } from "services/payment/createPaymentLink";
import { Conversation } from "services/conversation/handleIncomingMessage";

export async function startFulfillment(phone: string, conversation: Conversation): Promise<void> {
  logger.info("Fulfillment started", { phone, conversationId: conversation.conversationId, useCase: conversation.useCase });

  await db.collection("conversations").doc(conversation.conversationId).update({
    status: "generating",
    updatedAt: new Date(),
  });

  const config = getFlowConfig(conversation.useCase as UseCase);
  const cid = conversation.conversationId;

  // Generate and send all outputs defined by the flow config
  await sendText(cid, phone, "🎬 Here's your preview!");

  for (const output of config.outputs) {
    const result = await output.generate(conversation.collectedData);
    await dispatchOutput(cid, phone, output.type, result);
  }

  // Create Razorpay payment link and send to user
  const { id, shortUrl } = await createPaymentLink(
    phone,
    cid,
    config.pricing.amount,
    `Whybee ${config.name}`
  );

  await sendText(cid, phone, `💳 To receive your final files, please complete payment:\n${shortUrl}`);

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
