import { sendWhatsAppRequest } from "./client";

export async function sendAudio(phone: string, audioUrl: string): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "audio",
    audio: { link: audioUrl },
  });
}
