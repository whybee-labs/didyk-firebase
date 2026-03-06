// TODO: replace with real image generation service
const PLACEHOLDER_IMAGE_URL = "https://placehold.co/1280x720.jpg";

export async function generateImage(data: Record<string, unknown>): Promise<string> {
  void data; // will be used by real implementation
  return PLACEHOLDER_IMAGE_URL;
}
