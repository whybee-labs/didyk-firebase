import { onRequest, Request } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { Response } from "express";
import {
  WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  GROQ_API_KEY,
} from "config/env";
import { parseWebhookPayload } from "services/whatsapp/parseWebhookPayload";
import { handleIncomingMessage } from "services/conversation/handleIncomingMessage";

export const whatsappWebhook = onRequest(
  { secrets: [WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, GROQ_API_KEY] },
  async (req, res) => {
    if (req.method === "GET") {
      handleVerification(req, res);
      return;
    }

    if (req.method === "POST") {
      await handleIncoming(req, res);
      return;
    }

    res.status(405).send("Method Not Allowed");
  }
);

function handleVerification(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN.value()) {
    logger.info("WhatsApp webhook verified successfully");
    res.status(200).send(challenge);
    return;
  }

  logger.warn("WhatsApp webhook verification failed", { mode, token });
  res.status(403).send("Forbidden");
}

async function handleIncoming(req: Request, res: Response): Promise<void> {
  // Respond 200 immediately so Meta doesn't retry
  res.status(200).send("OK");

  const parsed = parseWebhookPayload(req.body);
  if (!parsed) return;

  logger.info("Incoming WhatsApp message", { parsed });

  try {
    await handleIncomingMessage(parsed.phone, parsed);
  } catch (err) {
    logger.error("Error handling incoming message", { err });
  }
}
