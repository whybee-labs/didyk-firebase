import axios from "axios";
import { WHATSAPP_ACCESS_TOKEN } from "config/env";

const META_API_VERSION = "v22.0";
const SIMULATOR_BASE = process.env.SIMULATOR_URL?.replace("/mock-wa-api", "") || "http://localhost:5051";

/**
 * Get a temporary URL for a WhatsApp media ID (image, video, etc.).
 * The URL requires the same Bearer token to download.
 */
export async function getWhatsAppMediaUrl(mediaId: string): Promise<string> {
  if (process.env.SIMULATOR_MODE === "true") {
    const res = await axios.get<{ url: string }>(`${SIMULATOR_BASE}/media/${mediaId}`, {
      headers: { Accept: "application/json" },
    });
    const url = res.data?.url;
    if (!url) throw new Error("Simulator media response missing url");
    return url;
  }

  const token = WHATSAPP_ACCESS_TOKEN.value();
  const res = await axios.get<{ url: string }>(
    `https://graph.facebook.com/${META_API_VERSION}/${mediaId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const url = res.data?.url;
  if (!url) throw new Error("WhatsApp media response missing url");
  return url;
}

/**
 * Download media from WhatsApp: resolve media ID to URL, then download with auth.
 * Returns the file buffer and inferred content type (from Content-Type header or extension).
 */
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const mediaUrl = await getWhatsAppMediaUrl(mediaId);

  const headers: Record<string, string> = {};
  if (process.env.SIMULATOR_MODE !== "true") {
    headers.Authorization = `Bearer ${WHATSAPP_ACCESS_TOKEN.value()}`;
  }

  const res = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    headers,
  });
  const buffer = Buffer.from(res.data as ArrayBuffer);
  const contentType = (res.headers["content-type"] as string) || "image/jpeg";
  const mimeType = contentType.split(";")[0].trim();
  return { buffer, mimeType };
}
