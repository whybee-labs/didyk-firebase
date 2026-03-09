import { FlowConfig } from "./types";
import { generateVideo } from "services/generators/videoGenerator";
import { generateText } from "services/generators/textGenerator";

export const birthdayFlow: FlowConfig = {
  id: "birthday",
  name: "Birthday Video",
  buttonTitle: "🎂 Birthday",
  description: "A personalised birthday video for someone special",
  waFlowId: "BIRTHDAY_FLOW_ID_PLACEHOLDER",
  fields: [
    { key: "recipientName", type: "text", required: true, label: "Recipient's name", formKey: "recipient_name" },
    { key: "birthdayMessage", type: "text", required: true, label: "Birthday message or wishes", formKey: "birthday_message" },
    { key: "images", type: "media", required: true, label: "Photos of the birthday person (1–3)" },
  ],
  outputs: [
    { type: "video", generate: generateVideo },
    { type: "text",  generate: generateText },
  ],
  confirmationTemplate: (data) => {
    const images = (data.images as string[] | undefined) ?? [];
    return [
      "🎂 *Birthday Video Summary*",
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
