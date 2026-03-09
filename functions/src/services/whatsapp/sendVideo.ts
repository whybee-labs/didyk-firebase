import { sendWhatsAppRequest } from "./client";
import { logOutbound } from "utils/messageLog";

export async function sendVideo(conversationId: string, phone: string, videoUrl: string): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "video",
    video: { link: videoUrl },
  });
  logOutbound(conversationId, "video", videoUrl);
}
