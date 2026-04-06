import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { sendCTAButton } from "services/whatsapp/sendCTAButton";
import { sendVideo } from "services/whatsapp/sendVideo";
import { sendImage } from "services/whatsapp/sendImage";
import { sendAudio } from "services/whatsapp/sendAudio";
import { OutputType } from "config/products/types";
import { Conversation } from "types/conversation";
import { generateImage } from "services/generators/imageGenerator";
import { generateVideo } from "services/generators/videoGenerator";
import { generateAudio } from "services/generators/audioGenerator";
import { uploadFile } from "services/storage/uploadFile";
import { createPaymentLink } from "services/payment/createPaymentLink";
import { t } from "utils/t";

const PRICES: Record<OutputType, number> = {
  image: 99,
  video: 299,
  audio: 149,
};

/**
 * Pay-first: create payment link and send CTA button. No generation yet.
 * Called from drafting when user taps "Create now".
 */
export async function createOrderAndRequestPayment(phone: string, conversation: Conversation): Promise<void> {
  const cid = conversation.conversationId;
  const outputType = conversation.structuredData.outputType!;
  const amount = PRICES[outputType];

  logger.info("Creating payment order", { phone, cid, outputType, amount });

  const { id: linkId, shortUrl } = await createPaymentLink(
    phone,
    cid,
    amount,
    t("fulfillment.paymentDescription", { outputType })
  );

  await db.collection("conversations").doc(cid).update({
    status: "awaiting_payment",
    paymentData: { linkId, amount, currency: "INR", createdAt: new Date() },
    updatedAt: new Date(),
  });

  await sendCTAButton(
    cid,
    phone,
    t("drafting.paymentPrompt"),
    t("fulfillment.payNowButton", { amount: String(amount) }),
    shortUrl
  );
}

/**
 * Post-payment: generate content, upload, and deliver.
 * Called from Razorpay webhook after payment is confirmed.
 */
export async function generateAndDeliver(phone: string, conversation: Conversation): Promise<void> {
  const cid = conversation.conversationId;
  const outputType = conversation.structuredData.outputType!;
  const enrichedPrompt = String(conversation.unstructuredData._enrichedPrompt ?? "");

  await db.collection("conversations").doc(cid).update({
    status: "generating",
    processing: true,
    updatedAt: new Date(),
  });

  try {
    let cleanUrl: string;

    if (outputType === "image") {
      const buffer = await generateImage({ structuredData: conversation.structuredData, enrichedPrompt });
      cleanUrl = await uploadFile(buffer, "image/png", "images");
    } else if (outputType === "video") {
      cleanUrl = await generateVideo({ structuredData: conversation.structuredData, enrichedPrompt, unstructuredData: conversation.unstructuredData });
    } else {
      cleanUrl = await generateAudio({ structuredData: conversation.structuredData, enrichedPrompt });
    }

    await db.collection("conversations").doc(cid).update({
      cleanUrl,
      status: "delivering",
      updatedAt: new Date(),
    });

    await dispatchOutput(cid, phone, outputType, cleanUrl);
  } catch (err) {
    logger.error("Generation failed after payment", { err, cid });
    await sendText(cid, phone, t("errors.outputFailed"));
    await db.collection("conversations").doc(cid).update({
      status: "drafting",
      updatedAt: new Date(),
    });
  } finally {
    await db.collection("conversations").doc(cid).update({
      processing: false,
      updatedAt: new Date(),
    }).catch(() => undefined);
  }
}

export async function dispatchOutput(
  conversationId: string,
  phone: string,
  type: OutputType,
  value: string
): Promise<void> {
  switch (type) {
    case "video": return sendVideo(conversationId, phone, value);
    case "image": return sendImage(conversationId, phone, value);
    case "audio": return sendAudio(conversationId, phone, value);
  }
}
