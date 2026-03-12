import { generatePdf } from "services/generators/pdfGenerator";
import { ProductConfig } from "./types";

export const weddingProduct: ProductConfig = {
  id: "wedding",
  name: "Wedding Invite",
  description: "A beautiful wedding invitation",
  waFlowId: "WEDDING_FLOW_ID_PLACEHOLDER",
  openingPrompt:
    "Let's create your wedding invitation! 💍\n\nTell me: the couple's names, wedding date, venue, and any reception details. You can also add who's hosting and the RSVP deadline.",
  fields: [
    { key: "coupleName",       type: "text", required: true,  label: "Couple's names (e.g. Arjun & Meera)" },
    { key: "weddingDate",      type: "text", required: true,  label: "Wedding date" },
    { key: "venue",            type: "text", required: true,  label: "Ceremony venue" },
    { key: "receptionDetails", type: "text", required: false, label: "Reception details (time/place)" },
    { key: "rsvpBy",           type: "text", required: false, label: "RSVP by date" },
    { key: "hostedBy",         type: "text", required: false, label: "Hosted by (e.g. The Sharma & Verma families)" },
  ],
  useCases: [
    {
      id: "uc-wedding-ivory",
      label: "Ivory Classic",
      description: "Elegant ivory & gold with serif typography",
      pricing: { INR: 149, USD: 3 },
      outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "wedding-ivory" }) }],
    },
    {
      id: "uc-wedding-midnight",
      label: "Midnight Luxe",
      description: "Dark and dramatic with gold accents",
      pricing: { INR: 149, USD: 3 },
      outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "wedding-midnight" }) }],
    },
  ],
  confirmationTemplate: (data) =>
    [
      "💍 *Wedding Invite Summary*",
      "",
      `👫 *Couple:* ${data.coupleName ?? "—"}`,
      `📅 *Date:* ${data.weddingDate ?? "—"}`,
      `📍 *Venue:* ${data.venue ?? "—"}`,
      ...(data.receptionDetails ? [`🥂 *Reception:* ${data.receptionDetails}`] : []),
      ...(data.rsvpBy    ? [`📝 *RSVP by:* ${data.rsvpBy}`]       : []),
      ...(data.hostedBy  ? [`👨‍👩‍👧 *Hosted by:* ${data.hostedBy}`]  : []),
    ].join("\n"),
};
