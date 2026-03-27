import { StructuredData, UnstructuredData } from "config/products/types";

// TODO: replace with real video generation API (Veo / Runway / Kling)
const PLACEHOLDER_VIDEO_URL =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export async function generateVideo(data: {
  structuredData: StructuredData;
  enrichedPrompt: string;
  unstructuredData: UnstructuredData;
}): Promise<string> {
  void data;
  return PLACEHOLDER_VIDEO_URL;
}
