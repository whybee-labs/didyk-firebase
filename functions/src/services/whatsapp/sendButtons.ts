import { sendWhatsAppRequest } from "./client";

export interface Button {
  id: string;
  title: string;
}

export async function sendButtons(
  phone: string,
  bodyText: string,
  buttons: Button[]
): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}
