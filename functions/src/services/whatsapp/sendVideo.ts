import { sendWhatsAppRequest } from "./client";

export async function sendVideo(phone: string, videoUrl: string): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "video",
    video: { link: videoUrl },
  });
}
