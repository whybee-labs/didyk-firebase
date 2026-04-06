import * as crypto from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import {
  RAZORPAY_WEBHOOK_SECRET,
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  GOOGLE_GENAI_API_KEY,
  OPENAI_API_KEY,
} from "config/env";
import { db } from "utils/firestore";
import { sendText } from "services/whatsapp/sendText";
import { generateAndDeliver } from "services/conversation/fulfillment";
import { sendFeedbackRequest } from "services/conversation/feedback";
import { StructuredData, UnstructuredData } from "config/products/types";
import { Conversation, ConversationStatus, HistoryEntry } from "types/conversation";
import { t } from "utils/t";

export const razorpayWebhook = onRequest(
  { secrets: [RAZORPAY_WEBHOOK_SECRET, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, GOOGLE_GENAI_API_KEY, OPENAI_API_KEY] },
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

  // Mark as paid immediately
  await db.collection("conversations").doc(conversationId).update({
    "paymentData.paidAt": new Date(),
    updatedAt: new Date(),
  });

  // Send "working on it" message
  await sendText(conversationId, phone, t("status.generatingAfterPayment"));

  // Build conversation object for generation
  const conversation: Conversation = {
    conversationId,
    phone,
    status: (convData.status as ConversationStatus) ?? "awaiting_payment",
    intentId: convData.intentId as string | undefined,
    structuredData: (convData.structuredData as StructuredData) ?? { referenceImageUrls: [] },
    unstructuredData: (convData.unstructuredData as UnstructuredData) ?? {},
    messageHistory: convData.messageHistory as HistoryEntry[] | undefined,
    cleanUrl: convData.cleanUrl as string | undefined,
    previewUrl: convData.previewUrl as string | undefined,
    refinementCount: convData.refinementCount as number | undefined,
    paymentData: convData.paymentData as Conversation["paymentData"],
    feedbackData: convData.feedbackData as Conversation["feedbackData"],
    lastMessageAt: (convData.lastMessageAt as any)?.toDate?.() ?? new Date(0),
    createdAt: (convData.createdAt as any)?.toDate?.() ?? new Date(0),
    updatedAt: (convData.updatedAt as any)?.toDate?.() ?? new Date(0),
  };

  // Generate and deliver
  try {
    await generateAndDeliver(phone, conversation);
  } catch (err) {
    logger.error("Post-payment generation failed", { conversationId, err });
    await sendText(conversationId, phone, t("errors.outputFailed")).catch(() => undefined);
    return;
  }

  // Send feedback request after a short delay
  await new Promise((resolve) => setTimeout(resolve, 4000));
  await sendFeedbackRequest(conversationId, phone);

  logger.info("Payment confirmed, content generated and delivered", { conversationId, phone });
}
