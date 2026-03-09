import { sendWhatsAppRequest } from "./client";
import { logOutbound } from "utils/messageLog";

export async function sendImage(conversationId: string, phone: string, imageUrl: string): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "image",
    image: { link: imageUrl },
  });
  logOutbound(conversationId, "image", imageUrl);
}
