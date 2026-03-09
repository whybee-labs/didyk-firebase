// TODO: replace with real audio generation service
const PLACEHOLDER_AUDIO_URL =
  "https://samplelib.com/lib/preview/mp3/sample-3s.mp3";

export async function generateAudio(data: Record<string, unknown>): Promise<string> {
  void data; // will be used by real implementation
  return PLACEHOLDER_AUDIO_URL;
}
