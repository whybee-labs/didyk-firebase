import { sendWhatsAppRequest } from "./client";
import { logOutbound } from "utils/messageLog";

export interface ListSection {
  title?: string;
  rows: { id: string; title: string; description?: string }[];
}

export async function sendList(
  conversationId: string,
  phone: string,
  body: string,
  buttonLabel: string,   // tap-to-open button label (max 20 chars)
  sections: ListSection[]
): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: {
        button: buttonLabel,
        sections: sections.map((s) => ({
          ...(s.title ? { title: s.title } : {}),
          rows: s.rows.map((r) => ({
            id: r.id,
            title: r.title,
            ...(r.description ? { description: r.description } : {}),
          })),
        })),
      },
    },
  });
  logOutbound(conversationId, "list", body);
}
