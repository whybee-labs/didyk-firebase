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
import { sendVideo } from "services/whatsapp/sendVideo";
import { generateVideo } from "services/generators/videoGenerator";
import { t } from "utils/t";

export const razorpayWebhook = onRequest(
  { secrets: [RAZORPAY_WEBHOOK_SECRET, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID] },
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

    // Respond 200 immediately so Razorpay doesn't retry
    res.status(200).send("OK");

    const event = req.body?.event as string | undefined;
    if (event !== "payment_link.paid") return;

    try {
      await handlePaymentLinkPaid(req.body);
    } catch (err) {
      logger.error("Error handling payment_link.paid", { err });
    }
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

  const phone = convSnap.data()?.phone as string;

  await sendText(conversationId, phone, t("fulfillment.delivering"));

  const stubVideoUrl = await generateVideo({});
  await sendVideo(conversationId, phone, stubVideoUrl);

  await db.collection("conversations").doc(conversationId).update({
    status: "completed",
    "paymentData.paidAt": new Date(),
    updatedAt: new Date(),
  });

  logger.info("Payment confirmed, stub video sent", { conversationId, phone });
}
