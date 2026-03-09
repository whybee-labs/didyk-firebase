import { sendWhatsAppRequest } from "./client";
import { logOutbound } from "utils/messageLog";

export async function sendAudio(conversationId: string, phone: string, audioUrl: string): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "audio",
    audio: { link: audioUrl },
  });
  logOutbound(conversationId, "audio", audioUrl);
}
