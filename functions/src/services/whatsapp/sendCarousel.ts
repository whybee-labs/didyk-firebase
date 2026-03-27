import { sendWhatsAppRequest } from "./client";
import { logOutbound } from "utils/messageLog";

export interface CarouselCard {
  id: string;
  label: string;
  description?: string;
  previewUrl: string;
  buttonLabel: string;
}

/**
 * Send a WhatsApp interactive carousel (Cloud API session message — no pre-approval needed).
 * Each card has an image header and a single reply button. Max 10 cards.
 * Taps return as button_reply messages.
 */
export async function sendCarousel(
  conversationId: string,
  phone: string,
  cards: CarouselCard[],
  bodyText: string
): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "interactive",
    interactive: {
      type: "carousel",
      body: { text: bodyText },
      action: {
        sections: [
          {
            cards: cards.map((card) => ({
              header: {
                type: "image",
                image: { link: card.previewUrl },
              },
              body: {
                text: card.description ? `${card.label}\n${card.description}` : card.label,
              },
              action: {
                buttons: [
                  {
                    type: "reply",
                    reply: { id: card.id, title: card.buttonLabel },
                  },
                ],
              },
            })),
          },
        ],
      },
    },
  });
  logOutbound(conversationId, "carousel", bodyText);
}
