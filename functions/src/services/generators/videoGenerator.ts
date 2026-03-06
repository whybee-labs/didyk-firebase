// TODO: replace with real video generation service
const PLACEHOLDER_VIDEO_URL =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export async function generateVideo(data: Record<string, unknown>): Promise<string> {
  void data; // will be used by real implementation
  return PLACEHOLDER_VIDEO_URL;
}
