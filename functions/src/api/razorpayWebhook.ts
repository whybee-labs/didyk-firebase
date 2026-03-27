import * as crypto from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import {
  RAZORPAY_WEBHOOK_SECRET,
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
} from "config/env";
import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { dispatchOutput } from "services/conversation/fulfillment";
import { sendFeedbackRequest } from "services/conversation/feedback";
import { StructuredData } from "config/products/types";
import { t } from "utils/t";

export const razorpayWebhook = onRequest(
  { minInstances: 1, secrets: [RAZORPAY_WEBHOOK_SECRET, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const sig = req.headers["x-razorpay-signature"] as string | undefined;
    if (!sig) {
      res.status(400).send("Missing signature");
      return;
    }

    const expected = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET.value())
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (sig !== expected) {
      logger.warn("Razorpay webhook signature mismatch");
      res.status(400).send("Invalid signature");
      return;
    }

    const event = req.body?.event as string | undefined;

    if (event === "payment_link.paid") {
      try {
        await handlePaymentLinkPaid(req.body);
      } catch (err) {
        logger.error("Error handling payment_link.paid", { err });
      }
    }

    res.status(200).send("OK");
  }
);

async function handlePaymentLinkPaid(body: Record<string, unknown>): Promise<void> {
  const entity = (body as any)?.payload?.payment_link?.entity;
  const paymentLinkId = entity?.id as string | undefined;

  if (!paymentLinkId) {
    logger.warn("payment_link.paid missing payment link id", { entity });
    return;
  }

  const convQuery = await db.collection("conversations")
    .where("paymentData.linkId", "==", paymentLinkId)
    .limit(1)
    .get();

  if (convQuery.empty) {
    logger.warn("Conversation not found for payment link", { paymentLinkId });
    return;
  }

  const convSnap = convQuery.docs[0];
  const conversationId = convSnap.id;
  const convData = convSnap.data();

  if (convData?.paymentData?.paidAt) {
    logger.info("Payment already processed, skipping", { conversationId });
    return;
  }

  const phone = convData?.phone as string;
  const structuredData = (convData?.structuredData ?? {}) as StructuredData;
  const unstructuredData = (convData?.unstructuredData ?? {}) as Record<string, unknown>;
  const enrichedPrompt = String(unstructuredData._enrichedPrompt ?? "");
  const outputType = structuredData.outputType;

  await sendText(conversationId, phone, t("fulfillment.delivering"));

  if (!outputType) {
    logger.error("No outputType on conversation, cannot dispatch final output", { conversationId });
    await sendText(conversationId, phone, t("errors.outputFailed"));
    return;
  }

  try {
    let url: string;

    if (outputType === "image") {
      const { generateImage } = await import("services/generators/imageGenerator");
      url = await generateImage({ structuredData, enrichedPrompt });
    } else if (outputType === "video") {
      const { generateVideo } = await import("services/generators/videoGenerator");
      url = await generateVideo({ structuredData, enrichedPrompt, unstructuredData });
    } else {
      const { generateAudio } = await import("services/generators/audioGenerator");
      url = await generateAudio({ structuredData, enrichedPrompt });
    }

    await dispatchOutput(conversationId, phone, outputType, url);
  } catch (err) {
    logger.error("Final output generation failed", { conversationId, err });
    await sendText(conversationId, phone, t("errors.outputFailed")).catch(() => undefined);
  }

  await db.collection("conversations").doc(conversationId).update({
    "paymentData.paidAt": new Date(),
    updatedAt: new Date(),
  });

  await new Promise((resolve) => setTimeout(resolve, 4000));
  await sendFeedbackRequest(conversationId, phone);

  logger.info("Payment confirmed, final output dispatched", { conversationId, phone });
}
