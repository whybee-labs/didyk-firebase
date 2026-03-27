export type OutputType = "image" | "video" | "audio";

export const PLATFORM_ASPECT_RATIO: Record<string, string> = {
  instagram_post:      "1:1",
  instagram_story:     "9:16",
  instagram_reel:      "9:16",
  whatsapp_status:     "9:16",
  youtube_shorts:      "9:16",
  youtube:             "16:9",
  youtube_thumbnail:   "16:9",
  general:             "1:1",
};

// Collected via intake buttons — maps 1:1 to AI model API params.
// LLM never writes to this.
export interface StructuredData {
  outputType?: OutputType;  // set during intake step 1

  // image + video
  platform?: string;
  style?: string;
  aspectRatio?: string;   // derived from platform, never asked directly

  // video only
  duration?: number;      // seconds: 5 | 10 | 15 | 30

  // audio only
  genre?: string;
  mood?: string;

  // image + video
  referenceImageUrls: string[];   // empty = no references
}

// Free-form context gathered by LLM during briefing.
// Accumulates across the briefing loop. Fed into LLM prompts for generation.
export type UnstructuredData = Record<string, unknown>;

export interface PendingQuestion {
  key: string;
  type: "list" | "boolean" | "text";
}
