import { FlowConfig } from "./types";
import { generateImage } from "services/generators/imageGenerator";
import { generateText } from "services/generators/textGenerator";

export const shopFlow: FlowConfig = {
  id: "shop",
  name: "Shop Promo",
  description: "A promotional video for a shop or business",
  waFlowId: "SHOP_FLOW_ID_PLACEHOLDER",
  fields: [
    { key: "shopName", type: "text", required: true, label: "Shop name", formKey: "shop_name" },
    { key: "description", type: "text", required: true, label: "Promotion description", formKey: "description" },
    { key: "images", type: "media", required: true, label: "Product or logo photos (1–3)" },
  ],
  outputs: [
    { type: "image", generate: generateImage },
    { type: "text",  generate: generateText },
  ],
  confirmationTemplate: (data) => {
    const images = (data.images as string[] | undefined) ?? [];
    return [
      "🛍 *Shop Promo Summary*",
      "",
      `🏪 *Shop:* ${data.shopName ?? "—"}`,
      `📢 *Promotion:* ${data.description ?? "—"}`,
      `📸 *Photos:* ${images.length} uploaded`,
      "",
      "Does this look right?",
    ].join("\n");
  },
  pricing: { amount: 299, currency: "INR" },
};
