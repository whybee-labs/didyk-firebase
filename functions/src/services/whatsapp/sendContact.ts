import { sendWhatsAppRequest } from "./client";
import { logOutbound } from "utils/messageLog";

export async function sendContact(
  conversationId: string,
  phone: string,
  name: string,
  contactPhone: string
): Promise<void> {
  await sendWhatsAppRequest({
    messaging_product: "whatsapp",
    to: phone,
    type: "contacts",
    contacts: [
      {
        name: { formatted_name: name, first_name: name },
        phones: [{ phone: `+${contactPhone}`, type: "CELL", wa_id: contactPhone }],
      },
    ],
  });
  logOutbound(conversationId, "contacts", name);
}
