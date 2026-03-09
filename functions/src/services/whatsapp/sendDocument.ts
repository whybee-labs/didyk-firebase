import { sendWhatsAppRequest } from "./client";
import { logOutbound } from "utils/messageLog";

export async function sendDocument(
  conversationId: string,
  phone: string,
  documentUrl: string,
  filename: string
): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "document",
    document: { link: documentUrl, filename },
  });
  logOutbound(conversationId, "document", documentUrl);
}
