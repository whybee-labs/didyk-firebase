import axios from "axios";
import { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID } from "config/env";

const META_API_VERSION = "v22.0";
const SIMULATOR_URL = process.env.SIMULATOR_URL || "http://localhost:5051/mock-wa-api";

export async function sendWhatsAppRequest(body: object): Promise<void> {
  if (process.env.SIMULATOR_MODE === "true") {
    await axios.post(SIMULATOR_URL, body, {
      headers: { "Content-Type": "application/json" },
    });
    return;
  }

  const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID.value();
  const token = WHATSAPP_ACCESS_TOKEN.value();

  await axios.post(
    `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
}
