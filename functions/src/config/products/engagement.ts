import { generatePdf } from "services/generators/pdfGenerator";
import { ProductConfig } from "./types";

export const engagementProduct: ProductConfig = {
  id: "engagement",
  name: "Engagement Invite",
  description: "A romantic engagement celebration invitation",
  waFlowId: "ENGAGEMENT_FLOW_ID_PLACEHOLDER",
  openingPrompt:
    "Let's create your engagement invitation! 💍\n\nTell me: the couple's names, the date, venue, who's hosting, and any special note you'd like to add.",
  fields: [
    { key: "coupleName", type: "text", required: true,  label: "Couple's names" },
    { key: "date",       type: "text", required: true,  label: "Engagement date" },
    { key: "venue",      type: "text", required: true,  label: "Venue" },
    { key: "hostedBy",   type: "text", required: false, label: "Hosted by" },
    { key: "note",       type: "text", required: false, label: "Special note or message" },
  ],
  useCases: [
    {
      id: "uc-engagement-rose",
      label: "Rose Romance",
      description: "Soft blush pink, romantic and elegant",
      pricing: { INR: 99, USD: 2 },
      outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "engagement-rose" }) }],
    },
  ],
  confirmationTemplate: (data) =>
    [
      "💍 *Engagement Invite Summary*",
      "",
      `👫 *Couple:* ${data.coupleName ?? "—"}`,
      `📅 *Date:* ${data.date ?? "—"}`,
      `📍 *Venue:* ${data.venue ?? "—"}`,
      ...(data.hostedBy ? [`👨‍👩‍👧 *Hosted by:* ${data.hostedBy}`] : []),
      ...(data.note     ? [`💬 *Note:* ${data.note}`]              : []),
    ].join("\n"),
};
