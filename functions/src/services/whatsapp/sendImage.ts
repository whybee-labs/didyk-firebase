import { sendWhatsAppRequest } from "./client";
import { logOutbound } from "utils/messageLog";

export async function sendImage(conversationId: string, phone: string, imageUrl: string, caption?: string): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "image",
    image: caption ? { link: imageUrl, caption } : { link: imageUrl },
  });
  logOutbound(conversationId, "image", imageUrl);
}
