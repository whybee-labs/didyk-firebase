import { GoogleGenAI } from "@google/genai";
import { GOOGLE_GENAI_API_KEY } from "config/env";
import { uploadFile } from "services/storage/uploadFile";
import { StructuredData } from "config/products/types";

let ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: GOOGLE_GENAI_API_KEY.value() });
  }
  return ai;
}

async function fetchAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  return { data: buffer.toString("base64"), mimeType };
}

export async function generateImage(data: {
  structuredData: StructuredData;
  enrichedPrompt: string;
}): Promise<string> {
  const aspectRatio = data.structuredData.aspectRatio ?? "1:1";
  const refUrls = data.structuredData.referenceImageUrls ?? [];

  const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (refUrls.length > 0) {
    const images = await Promise.all(refUrls.map(fetchAsBase64));
    for (const img of images) {
      contents.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    }
  }

  contents.push({ text: data.enrichedPrompt });

  const response = await getClient().models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents,
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio,
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  const b64 = imagePart?.inlineData?.data;

  if (!b64) {
    throw new Error("No image returned from Nano Banana 2");
  }

  const buffer = Buffer.from(b64, "base64");
  return uploadFile(buffer, "image/png", "images");
}
