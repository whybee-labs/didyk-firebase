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
import { createPaymentLink } from "services/payment/createPaymentLink";
import { t } from "utils/t";

// Prices in INR — placeholder until real pricing is defined
const PRICES: Record<OutputType, number> = {
  image: 99,
  video: 299,
  audio: 149,
};

export async function startFulfillment(phone: string, conversation: Conversation): Promise<void> {
  logger.info("Fulfillment started", {
    phone,
    conversationId: conversation.conversationId,
    outputType: conversation.structuredData.outputType,
    intentId: conversation.intentId,
  });

  const cid = conversation.conversationId;
  const outputType = conversation.structuredData.outputType!;
  const enrichedPrompt = String(conversation.unstructuredData._enrichedPrompt ?? "");

  await db.collection("conversations").doc(cid).update({
    status: "generating",
    updatedAt: new Date(),
  });

  try {
    let url: string;

    if (outputType === "image") {
      url = await generateImage({ structuredData: conversation.structuredData, enrichedPrompt });
    } else if (outputType === "video") {
      url = await generateVideo({ structuredData: conversation.structuredData, enrichedPrompt, unstructuredData: conversation.unstructuredData });
    } else {
      url = await generateAudio({ structuredData: conversation.structuredData, enrichedPrompt });
    }

    // Send the preview
    await sendText(cid, phone, t("fulfillment.previewLabel"));
    await dispatchOutput(cid, phone, outputType, url);

    // Create payment link and send it
    const amount = PRICES[outputType];
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
      t("fulfillment.paymentPrompt"),
      t("fulfillment.payNowButton", { amount: String(amount) }),
      shortUrl
    );

  } catch (err) {
    logger.error("Fulfillment failed", { err });
    await sendText(cid, phone, t("errors.outputFailed"));
    await db.collection("conversations").doc(cid).update({
      status: "briefing",
      updatedAt: new Date(),
    });
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
