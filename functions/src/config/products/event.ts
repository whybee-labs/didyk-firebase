import { generateVideo } from "services/generators/videoGenerator";
import { generateImage } from "services/generators/imageGenerator";
import { generatePdf } from "services/generators/pdfGenerator";
import { ProductConfig } from "./types";

export const eventProduct: ProductConfig = {
  id: "event",
  name: "Event Invite",
  description: "An invitation for an event, party, or gathering",
  waFlowId: "EVENT_FLOW_ID_PLACEHOLDER",
  openingPrompt: "Tell me about your event! 🎉 What is it, when, and where? Just type it all out.",
  fields: [
    { key: "eventName", type: "text", required: true, label: "Event name", formKey: "event_name" },
    { key: "dateTime", type: "text", required: true, label: "Date and time", formKey: "date_time" },
    { key: "venue", type: "text", required: true, label: "Venue or location", formKey: "venue" },
    { key: "images", type: "media", required: false, label: "Photos or banner (optional, up to 3)" },
  ],
  useCases: [
    {
      id: "uc-event-invite",
      label: "Event Invite",
      description: "A video invite with event details and photos",
      outputs: [
        { type: "video", generate: generateVideo },
        { type: "pdf", generate: (data) => generatePdf({ ...data, _template: "event-invite" }) },
      ],
    },
    {
      id: "uc-event-card",
      label: "Event Card",
      description: "A digital event invitation card",
      outputs: [
        { type: "image", generate: generateImage },
      ],
    },
    {
      id: "uc-event-poster",
      label: "Event Poster",
      description: "A printable poster for your event",
      outputs: [
        { type: "image", generate: generateImage },
        { type: "pdf", generate: (data) => generatePdf({ ...data, _template: "event-invite" }) },
      ],
    },
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
    ].join("\n");
  },
  pricing: { INR: 249, USD: 6 },
};
