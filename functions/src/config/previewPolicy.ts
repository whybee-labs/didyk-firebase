/**
 * Preview policy — tweak these values to experiment with different strategies.
 * No code changes needed; just update and redeploy.
 */
export const PREVIEW_POLICY = {
  /** Max preview generations per user in the rolling window. Set to Infinity to disable the cap. */
  maxPreviewsPerUser: 5,

  /** Rolling window in days. Set to null for a lifetime cap. */
  windowDays: 7 as number | null,

  /** Max times a user can refine their brief (and regenerate) within one conversation. */
  maxRefinementsPerConversation: 1,

  /** Overlay a "whybee" watermark on preview images. */
  watermark: true,

  /** Downscale preview to 50% resolution. */
  lowRes: false,
};
