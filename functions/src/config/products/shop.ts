import { ProductConfig } from "./types";

export const shopProduct: ProductConfig = {
  id: "shop",
  name: "Business Promo",
  description: "Promotional content for a shop or business",
  waFlowId: "SHOP_FLOW_ID_PLACEHOLDER",
  fields: [
    { key: "shopName", type: "text", required: true, label: "Shop name", formKey: "shop_name" },
    { key: "description", type: "text", required: true, label: "Promotion description", formKey: "description" },
    { key: "images", type: "media", required: true, label: "Product or logo photos (1–3)" },
  ],
  confirmationTemplate: (data) => {
    const images = (data.images as string[] | undefined) ?? [];
    return [
      "🛍️ *Business Promo Summary*",
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
