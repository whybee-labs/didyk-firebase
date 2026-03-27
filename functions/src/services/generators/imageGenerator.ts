import OpenAI from "openai";
import { OPENAI_IMAGE_API_KEY } from "config/env";
import { uploadFile } from "services/storage/uploadFile";
import { StructuredData } from "config/products/types";

type ImageSize = "1024x1024" | "1024x1536" | "1536x1024";

function resolveSize(structuredData: StructuredData): ImageSize {
  const ratio = structuredData.aspectRatio;
  if (ratio === "9:16") return "1024x1536";
  if (ratio === "16:9") return "1536x1024";
  return "1024x1024";
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: OPENAI_IMAGE_API_KEY.value() });
  }
  return client;
}

export async function generateImage(data: {
  structuredData: StructuredData;
  enrichedPrompt: string;
}): Promise<string> {
  const response = await getClient().images.generate({
    model: "gpt-image-1",
    prompt: data.enrichedPrompt,
    n: 1,
    size: resolveSize(data.structuredData),
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI");

  const buffer = Buffer.from(b64, "base64");
  return uploadFile(buffer, "image/png", "images");
}
