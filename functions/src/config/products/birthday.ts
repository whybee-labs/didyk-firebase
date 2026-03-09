import { generateVideo } from "services/generators/videoGenerator";
import { generateImage } from "services/generators/imageGenerator";
import { generateText } from "services/generators/textGenerator";
import { ProductConfig } from "./types";

export const birthdayProduct: ProductConfig = {
  id: "birthday",
  name: "Birthday",
  description: "Personalised birthday content for someone special",
  waFlowId: "BIRTHDAY_FLOW_ID_PLACEHOLDER",
  fields: [
    { key: "recipientName", type: "text", required: true, label: "Recipient's name", formKey: "recipient_name" },
    { key: "birthdayMessage", type: "text", required: true, label: "Birthday message or wishes", formKey: "birthday_message" },
    { key: "images", type: "media", required: true, label: "Photos of the birthday person (1–3)" },
  ],
  useCases: [
    {
      id: "uc-birthday-video",
      label: "Birthday Video",
      description: "A personalised video with photos and wishes",
      outputs: [
        { type: "video", generate: generateVideo },
        { type: "text", generate: generateText },
      ],
    },
    {
      id: "uc-birthday-card",
      label: "Birthday Card",
      description: "A beautiful digital birthday card",
      outputs: [
        { type: "image", generate: generateImage },
      ],
    },
    {
      id: "uc-photo-collage",
      label: "Photo Collage",
      description: "A photo collage with a personalised message",
      outputs: [
        { type: "image", generate: generateImage },
      ],
    },
  ],
  confirmationTemplate: (data) => {
    const images = (data.images as string[] | undefined) ?? [];
    return [
      "🎂 *Birthday Summary*",
      "",
      `👤 *For:* ${data.recipientName ?? "—"}`,
      `💬 *Message:* ${data.birthdayMessage ?? "—"}`,
      `📸 *Photos:* ${images.length} uploaded`,
      "",
      "Does this look right?",
    ].join("\n");
  },
  pricing: { amount: 199, currency: "INR" },
};
