import { sendWhatsAppRequest } from "./client";

export async function sendText(phone: string, text: string): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: text },
  });
}
