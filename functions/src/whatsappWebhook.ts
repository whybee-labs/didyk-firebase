import { onRequest, Request } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { Response } from "express";

const verifyToken = defineSecret("WHATSAPP_VERIFY_TOKEN");

export const whatsappWebhook = onRequest(
  { secrets: [verifyToken] },
  async (req, res) => {
    if (req.method === "GET") {
      handleVerification(req, res);
      return;
    }

    if (req.method === "POST") {
      handleIncomingMessage(req, res);
      return;
    }

    res.status(405).send("Method Not Allowed");
  }
);

function handleVerification(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken.value()) {
    logger.info("WhatsApp webhook verified successfully");
    res.status(200).send(challenge);
    return;
  }

  logger.warn("WhatsApp webhook verification failed", { mode, token });
  res.status(403).send("Forbidden");
}

function handleIncomingMessage(req: Request, res: Response): void {
  // Respond 200 immediately so Meta doesn't retry
  res.status(200).send("OK");

  const body = req.body as WhatsAppPayload;
  logger.info("Incoming WhatsApp event", { payload: body });

  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return;

  const sender = message.from;
  const text = message.text?.body;

  logger.info("Incoming WhatsApp message", { sender, text });
}

// Minimal types for the Meta webhook payload
interface WhatsAppPayload {
  object: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          text?: { body: string };
        }>;
      };
    }>;
  }>;
}
