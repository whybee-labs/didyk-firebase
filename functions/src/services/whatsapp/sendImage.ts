import { sendWhatsAppRequest } from "./client";

export async function sendImage(phone: string, imageUrl: string): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "image",
    image: { link: imageUrl },
  });
}
