import { sendWhatsAppRequest } from "./client";

export async function sendDocument(
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
}
