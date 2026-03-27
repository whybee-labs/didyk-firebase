import { Intent, OutputType } from "./types";

export const intents: Intent[] = [
  // ── Audio ──────────────────────────────────────────────────────────────
  {
    id: "rap_from_text",
    label: "rap songs from text",
    outputType: "audio",
    description: "Turn a piece of text, bio, or topic into a rap song",
    examples: [
      "make a rap about my company",
      "rap version of my bio",
      "create a diss track about my friend",
      "rap song about cricket",
    ],
    requiredFields: ["sourceText", "rapStyle", "theme"],
    briefingInstructions:
      "Collect the source text or topic to rap about. Ask about the vibe — aggressive, funny, hype, storytelling. Ask what message or punchline they want to land.",
    supportsReferenceImages: false,
  },
  {
    id: "product_jingle",
    label: "brand jingles",
    outputType: "audio",
    description: "Create a catchy jingle or audio ad for a product or business",
    examples: [
      "jingle for my bakery",
      "audio ad for my app",
      "catchy tune for my brand",
      "short music for my ad",
    ],
    requiredFields: ["brandName", "product", "targetFeeling"],
    briefingInstructions:
      "Collect the brand name, what they sell or offer, and the feeling they want the jingle to evoke. Ask if they have a tagline or slogan to work with.",
    supportsReferenceImages: false,
  },
  {
    id: "generic_audio",
    label: "",
    outputType: "audio",
    description: "Any other audio creation request that doesn't fit a specific category",
    examples: [],
    requiredFields: [],
    briefingInstructions:
      "Understand what kind of audio the user wants. Ask about the purpose, tone, style, and any specific content requirements.",
    supportsReferenceImages: false,
  },

  // ── Video ───────────────────────────────────────────────────────────────
  {
    id: "product_promo_video",
    label: "product & brand promo videos",
    outputType: "video",
    description: "Promotional video for a product, service, or business",
    examples: [
      "promo video for my shoe brand",
      "ad for my restaurant",
      "product launch video",
      "brand video for my startup",
    ],
    requiredFields: ["productName", "keyMessage", "targetAudience"],
    briefingInstructions:
      "Collect the product or business name, the core message they want to convey, and who the video is for. Ask about the tone — bold, emotional, fun, professional.",
    supportsReferenceImages: true,
    referenceImagesHint: "Got any product photos or brand assets? Share them and I'll include them in the video.",
  },
  {
    id: "social_reel",
    label: "social media reels",
    outputType: "video",
    description: "Short vertical video for Instagram Reels, YouTube Shorts, or WhatsApp Status",
    examples: [
      "instagram reel for my cafe",
      "youtube short about my product",
      "whatsapp status video",
      "viral reel idea",
    ],
    requiredFields: ["topic", "platform", "hook"],
    briefingInstructions:
      "Collect the topic or theme, which platform it's for, and the opening hook — the first 3 seconds that will stop someone from scrolling.",
    supportsReferenceImages: true,
    referenceImagesHint: "Got any photos or footage to include? Share them now.",
  },
  {
    id: "generic_video",
    label: "",
    outputType: "video",
    description: "Any other video creation request that doesn't fit a specific category",
    examples: [],
    requiredFields: [],
    briefingInstructions:
      "Understand what kind of video the user wants. Ask about the purpose, style, platform, and any specific content or visual requirements.",
    supportsReferenceImages: true,
  },

  // ── Image ───────────────────────────────────────────────────────────────
  {
    id: "product_poster",
    label: "promo posters & banners",
    outputType: "image",
    description: "Promotional poster, banner, or graphic for a product, event, or brand",
    examples: [
      "poster for my event",
      "sale banner for my shop",
      "product launch graphic",
      "festival offer poster",
    ],
    requiredFields: ["subject", "keyMessage"],
    briefingInstructions:
      "Collect what is being promoted and the key message or offer to highlight. Ask about the visual mood — bold, minimal, festive, elegant.",
    supportsReferenceImages: true,
    referenceImagesHint: "Share a photo of your product or brand — I'll use it as the base for the poster.",
  },
  {
    id: "social_post",
    label: "social media posts",
    outputType: "image",
    description: "Image for a social media post on Instagram, Facebook, LinkedIn, or WhatsApp",
    examples: [
      "instagram post for my business",
      "linkedin graphic",
      "facebook ad image",
      "motivational quote post",
    ],
    requiredFields: ["topic", "platform"],
    briefingInstructions:
      "Collect the topic or message and the target platform. Ask about the tone and whether they want text on the image.",
    supportsReferenceImages: true,
    referenceImagesHint: "Got a photo to use in the post? Share it now.",
  },
  {
    id: "generic_image",
    label: "",
    outputType: "image",
    description: "Any other image creation request that doesn't fit a specific category",
    examples: [],
    requiredFields: [],
    briefingInstructions:
      "Understand what kind of image the user wants. Ask about the subject, style, mood, and intended use.",
    supportsReferenceImages: true,
  },
];

export function getIntent(id: string): Intent {
  const intent = intents.find((i) => i.id === id);
  if (!intent) throw new Error(`Unknown intent: ${id}`);
  return intent;
}

export function genericIntentId(outputType: OutputType): string {
  return `generic_${outputType}`;
}

export function intentsForType(outputType: OutputType): Intent[] {
  return intents.filter((i) => i.outputType === outputType);
}

export function buildDiscoveryMessage(outputType: OutputType): string {
  const capabilities = intents
    .filter((i) => i.outputType === outputType && i.label !== "")
    .map((i) => i.label);

  const list = capabilities.slice(0, -1).join(", ") +
    (capabilities.length > 1 ? `, and ${capabilities[capabilities.length - 1]}` : capabilities[0] ?? "content");

  const emoji = outputType === "audio" ? "🎵" : outputType === "video" ? "🎬" : "🎨";
  return `${emoji} I can create ${list} — just tell me what you have in mind!`;
}

export { Intent, OutputType } from "./types";
