import { StructuredData } from "config/products/types";

// TODO: replace with real audio generation API (Suno / Udio / ElevenLabs)
const PLACEHOLDER_AUDIO_URL = "https://samplelib.com/lib/preview/mp3/sample-3s.mp3";

export async function generateAudio(data: {
  structuredData: StructuredData;
  enrichedPrompt: string;
}): Promise<string> {
  void data;
  return PLACEHOLDER_AUDIO_URL;
}
