import { FlowConfig } from "./types";
import { generateVideo } from "services/generators/videoGenerator";
import { generatePdf } from "services/generators/pdfGenerator";

export const eventFlow: FlowConfig = {
  id: "event",
  name: "Event Invite",
  buttonTitle: "🎉 Event Invite",
  description: "An invitation video for an event, party, or gathering",
  waFlowId: "EVENT_FLOW_ID_PLACEHOLDER",
  fields: [
    { key: "eventName", type: "text", required: true, label: "Event name", formKey: "event_name" },
    { key: "dateTime", type: "text", required: true, label: "Date and time", formKey: "date_time" },
    { key: "venue", type: "text", required: true, label: "Venue or location", formKey: "venue" },
    { key: "images", type: "media", required: false, label: "Photos or banner (optional, up to 3)" },
  ],
  outputs: [
    { type: "video", generate: generateVideo },
    { type: "pdf",   generate: generatePdf },
  ],
  confirmationTemplate: (data) => {
    const images = (data.images as string[] | undefined) ?? [];
    return [
      "🎉 *Event Invite Summary*",
      "",
      `🎊 *Event:* ${data.eventName ?? "—"}`,
      `📅 *When:* ${data.dateTime ?? "—"}`,
      `📍 *Where:* ${data.venue ?? "—"}`,
      `📸 *Photos:* ${images.length > 0 ? `${images.length} uploaded` : "None"}`,
      "",
      "Does this look right?",
    ].join("\n");
  },
  pricing: { amount: 249, currency: "INR" },
};
