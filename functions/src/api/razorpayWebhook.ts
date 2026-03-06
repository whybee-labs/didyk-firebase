import * as crypto from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import {
  RAZORPAY_WEBHOOK_SECRET,
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
} from "../config/env";
import { db } from "../utils/firestore";
import { sendText } from "../services/whatsapp/sendText";

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
  const sessionId = entity?.reference_id as string | undefined;

  if (!sessionId) {
    logger.warn("payment_link.paid missing reference_id", { entity });
    return;
  }

  const sessionSnap = await db.collection("conversations").doc(sessionId).get();
  if (!sessionSnap.exists) {
    logger.warn("Session not found for payment", { sessionId });
    return;
  }

  const phone = sessionSnap.data()?.phone as string;

  await db.collection("conversations").doc(sessionId).update({
    status: "completed",
    updatedAt: new Date(),
  });

  await sendText(phone, "✅ Payment received! Your video will be delivered shortly.");

  logger.info("Payment confirmed", { sessionId, phone });
}
