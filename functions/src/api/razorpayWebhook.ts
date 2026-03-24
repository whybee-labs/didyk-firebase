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
import { sendImage } from "services/whatsapp/sendImage";
import { sendDocument } from "services/whatsapp/sendDocument";
import { sendAudio } from "services/whatsapp/sendAudio";
import { findUseCase } from "config/catalog";
import { OutputType } from "config/products/types";
import { sendFeedbackRequest } from "services/conversation/feedback";
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

    // Respond after work completes — Cloud Run drops sockets after res.send(),
    // which causes ECONNRESET on Storage uploads if we respond first.
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

  // Idempotency: skip if already processed
  if (convData?.paymentData?.paidAt) {
    logger.info("Payment already processed, skipping", { conversationId });
    return;
  }

  const phone = convData?.phone as string;
  const useCase = convData?.useCase as string | undefined;

  await sendText(conversationId, phone, t("fulfillment.delivering"));

  let outputsDispatched = 0;

  if (useCase === "resume") {
    // Same function as preview — only _watermark differs
    try {
      const { generateAndSendResume } = await import("services/conversation/fulfillment");
      outputsDispatched = await generateAndSendResume(
        phone,
        conversationId,
        (convData?.collectedData ?? {}) as Record<string, unknown>,
        (convData?.selectedUseCaseIds ?? []) as string[],
        convData?.selectedPrimaryColor as string | undefined,
        false,
      );
    } catch (err) {
      logger.error("Resume final generation failed", { conversationId, err });
      await sendText(conversationId, phone, t("errors.outputFailed")).catch(() => undefined);
    }
  } else {
    const selectedUseCaseIds: string[] = convData?.selectedUseCaseIds ?? [];
    const collectedData: Record<string, unknown> = { ...(convData?.collectedData ?? {}) };
    for (const ucId of selectedUseCaseIds) {
      const uc = findUseCase(ucId);
      if (!uc?.outputs) continue;
      for (const output of uc.outputs) {
        try {
          const result = await output.generate({
            ...collectedData,
            _watermark: false,
            _phone: phone,
            _conversationId: conversationId,
          });
          await dispatchOutput(conversationId, phone, output.type, result);
          outputsDispatched++;
        } catch (err) {
          logger.error("Output generation failed", { ucId, type: output.type, err });
          await sendText(conversationId, phone, t("errors.outputFailed")).catch(() => undefined);
        }
      }
    }
  }

  if (outputsDispatched === 0) {
    logger.error("No outputs dispatched after payment", { conversationId });
    await sendText(conversationId, phone, t("errors.outputFailed")).catch(() => undefined);
  }

  await db.collection("conversations").doc(conversationId).update({
    "paymentData.paidAt": new Date(),
    updatedAt: new Date(),
  });

  // Delay so WhatsApp finishes delivering the file before the feedback prompt appears
  await new Promise((resolve) => setTimeout(resolve, 4000));

  // Ask for feedback — this also sets status to "awaiting_feedback"
  await sendFeedbackRequest(conversationId, phone);

  logger.info("Payment confirmed, outputs dispatched", { conversationId, phone, outputsDispatched });
}

async function dispatchOutput(
  conversationId: string,
  phone: string,
  type: OutputType,
  value: string,
  pdfFilename?: string
): Promise<void> {
  switch (type) {
    case "video":  return sendVideo(conversationId, phone, value);
    case "image":  return sendImage(conversationId, phone, value);
    case "pdf":    return sendDocument(conversationId, phone, value, pdfFilename ?? "whybee.pdf");
    case "audio":  return sendAudio(conversationId, phone, value);
    case "text":   return sendText(conversationId, phone, value);
  }
}
