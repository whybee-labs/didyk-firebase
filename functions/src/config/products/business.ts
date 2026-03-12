import { generateImage } from "services/generators/imageGenerator";
import { generateVideo } from "services/generators/videoGenerator";
import { generateText } from "services/generators/textGenerator";
import { ProductConfig } from "./types";

export const businessProduct: ProductConfig = {
  id: "business",
  name: "Business Promo",
  description: "Promotional content for your business",
  waFlowId: "BUSINESS_FLOW_ID_PLACEHOLDER",
  openingPrompt: "Tell me about your promo! 🛍️ What's your business and what are you promoting? Type it out, then send 1–3 product or logo photos 📸",
  fields: [
    { key: "businessName", type: "text", required: true, label: "Business name", formKey: "business_name" },
    { key: "description", type: "text", required: true, label: "Promotion description", formKey: "description" },
    { key: "images", type: "media", required: true, label: "Product or logo photos (1–3)" },
  ],
  useCases: [
    {
      id: "uc-business-promo-poster",
      label: "Promo Poster",
      description: "An eye-catching promotional poster",
      outputs: [
        { type: "image", generate: generateImage },
        { type: "text", generate: generateText },
      ],
    },
    {
      id: "uc-business-promo-video",
      label: "Promo Video",
      description: "A short promotional video for your business",
      outputs: [
        { type: "video", generate: generateVideo },
      ],
    },
    {
      id: "uc-business-promo-reel",
      label: "Promo Reel",
      description: "A vertical reel for Instagram or WhatsApp status",
      outputs: [
        { type: "video", generate: generateVideo },
      ],
    },
  ],
  confirmationTemplate: (data) => {
    const images = (data.images as string[] | undefined) ?? [];
    return [
      "🛍️ *Business Promo Summary*",
      "",
      `🏪 *Business:* ${data.businessName ?? "—"}`,
      `📢 *Promotion:* ${data.description ?? "—"}`,
      `📸 *Photos:* ${images.length} uploaded`,
    ].join("\n");
  },
  pricing: { INR: 299, USD: 7 },
};
