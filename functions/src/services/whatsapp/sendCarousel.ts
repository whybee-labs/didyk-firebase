import { sendWhatsAppRequest } from "./client";

export interface CarouselButton {
  index: number;
  payload: string; // returned as button_reply.payload in the webhook
}

export interface CarouselCard {
  cardIndex: number;
  imageUrl: string;
  bodyParams?: string[]; // dynamic text substitutions for the card body in the template
  buttons: CarouselButton[];
}

/**
 * Sends a WhatsApp carousel template message.
 *
 * Carousels require a pre-approved Meta template with carousel cards.
 * Each card must match the header/body/button structure defined in the template.
 *
 * Webhook response: each card button tap comes back as a standard
 * button_reply with the payload set here — parseWebhookPayload handles it.
 *
 * @param phone          - Recipient phone number
 * @param templateName   - Approved template name in Meta dashboard
 * @param languageCode   - e.g. "en" or "en_US"
 * @param bodyParams     - Top-level body parameter substitutions (if any)
 * @param cards          - Array of carousel cards (max 10 per Meta limits)
 */
export async function sendCarousel(
  phone: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
  cards: CarouselCard[]
): Promise<void> {
  const components: object[] = [];

  // Top-level body params (optional)
  if (bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParams.map((text) => ({ type: "text", text })),
    });
  }

  // Carousel cards
  components.push({
    type: "carousel",
    cards: cards.map((card) => {
      const cardComponents: object[] = [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: { link: card.imageUrl },
            },
          ],
        },
      ];

      if (card.bodyParams && card.bodyParams.length > 0) {
        cardComponents.push({
          type: "body",
          parameters: card.bodyParams.map((text) => ({ type: "text", text })),
        });
      }

      for (const button of card.buttons) {
        cardComponents.push({
          type: "button",
          sub_type: "quick_reply",
          index: String(button.index),
          parameters: [{ type: "payload", payload: button.payload }],
        });
      }

      return {
        card_index: String(card.cardIndex),
        components: cardComponents,
      };
    }),
  });

  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
}
