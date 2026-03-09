import { sendWhatsAppRequest } from "./client";
import { logOutbound } from "utils/messageLog";

export async function sendText(conversationId: string, phone: string, text: string): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: text },
  });
  logOutbound(conversationId, "text", text);
}
