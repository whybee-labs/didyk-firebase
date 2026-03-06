// TODO: replace with real audio generation service
const PLACEHOLDER_AUDIO_URL =
  "https://www.w3.org/WAI/WCAG21/Techniques/general/sample.mp3";

export async function generateAudio(data: Record<string, unknown>): Promise<string> {
  void data; // will be used by real implementation
  return PLACEHOLDER_AUDIO_URL;
}
