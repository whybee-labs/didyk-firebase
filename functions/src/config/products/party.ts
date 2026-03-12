import { generatePdf } from "services/generators/pdfGenerator";
import { ProductConfig } from "./types";

export const partyProduct: ProductConfig = {
  id: "party",
  name: "Party Invite",
  description: "A fun invitation for any celebration",
  waFlowId: "PARTY_FLOW_ID_PLACEHOLDER",
  openingPrompt:
    "Let's make a party invite! 🎉\n\nWhat's the occasion? Tell me the event title, date, venue, who's hosting, and any other details like dress code.",
  fields: [
    { key: "eventTitle", type: "text", required: true,  label: "Event title / occasion" },
    { key: "date",       type: "text", required: true,  label: "Date and time" },
    { key: "venue",      type: "text", required: true,  label: "Venue" },
    { key: "hostedBy",   type: "text", required: false, label: "Hosted by" },
    { key: "dressCode",  type: "text", required: false, label: "Dress code" },
    { key: "note",       type: "text", required: false, label: "Any other details" },
  ],
  useCases: [
    {
      id: "uc-party-vivid",
      label: "Vivid Party",
      description: "Bold and colourful, dark background, high energy",
      outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "party-vivid" }) }],
    },
  ],
  confirmationTemplate: (data) =>
    [
      "🎉 *Party Invite Summary*",
      "",
      `🎊 *Event:* ${data.eventTitle ?? "—"}`,
      `📅 *Date:* ${data.date ?? "—"}`,
      `📍 *Venue:* ${data.venue ?? "—"}`,
      ...(data.hostedBy  ? [`👤 *Hosted by:* ${data.hostedBy}`]   : []),
      ...(data.dressCode ? [`👗 *Dress code:* ${data.dressCode}`] : []),
      ...(data.note      ? [`💬 *Note:* ${data.note}`]            : []),
    ].join("\n"),
  pricing: { INR: 99, USD: 2 },
};
