import { StructuredData } from "config/products/types";

// TODO: replace with real image generation API (Fal.ai / Stability)
const PLACEHOLDER_IMAGE_URL = "https://placehold.co/1080x1080.jpg";

export async function generateImage(data: {
  structuredData: StructuredData;
  enrichedPrompt: string;
}): Promise<string> {
  void data;
  return PLACEHOLDER_IMAGE_URL;
}
