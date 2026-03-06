import { sendWhatsAppRequest } from "./client";
import { randomUUID } from "crypto";

export async function sendFlow(
  phone: string,
  flowId: string,
  headerText: string,
  bodyText: string,
  ctaText = "Fill Form"
): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "interactive",
    interactive: {
      type: "flow",
      header: { type: "text", text: headerText },
      body: { text: bodyText },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_token: randomUUID(),
          flow_id: flowId,
          flow_cta: ctaText,
          flow_action: "navigate",
          flow_action_payload: { screen: "INTRO" },
        },
      },
    },
  });
}
