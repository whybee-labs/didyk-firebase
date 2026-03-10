import { sendWhatsAppRequest } from "./client";
import { logOutbound } from "utils/messageLog";

export async function sendCTAButton(
  conversationId: string,
  phone: string,
  body: string,
  buttonLabel: string,
  url: string
): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: body },
      action: {
        name: "cta_url",
        parameters: {
          display_text: buttonLabel,
          url,
        },
      },
    },
  });
  logOutbound(conversationId, "cta_url", body);
}
