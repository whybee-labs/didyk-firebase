import { sendWhatsAppRequest } from "./client";

export interface TemplateComponent {
  type: string;
  parameters: Array<{ type: string; text?: string }>;
}

export async function sendTemplate(
  phone: string,
  templateName: string,
  languageCode: string,
  components: TemplateComponent[] = []
): Promise<void> {
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
