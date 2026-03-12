import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { templateRegistry } from "services/documents/templateRegistry";
import { registerFonts } from "./previewResume";

const OUT_DIR = path.resolve(process.cwd(), "preview");

export const INVITE_TEMPLATES: Array<{ key: string; label: string; data: Record<string, unknown> }> = [
  {
    key: "event-invite",
    label: "Event — Midnight",
    data: { eventName: "Annual Gala Night 2025", dateTime: "Saturday, 14 June 2025 · 7:00 PM", venue: "The Grand Ballroom, Hotel Taj, Mumbai" },
  },
  {
    key: "event-modern",
    label: "Event — Modern",
    data: { eventName: "Tech Summit 2025", dateTime: "Friday, 20 September 2025 · 9:00 AM", venue: "NSCI Dome, Worli, Mumbai" },
  },
  {
    key: "birthday-invite",
    label: "Birthday — Bloom",
    data: { recipientName: "Priya Sharma", birthdayMessage: "You make every room brighter just by walking in. Here's to you and another trip around the sun!" },
  },
  {
    key: "birthday-golden",
    label: "Birthday — Golden",
    data: { recipientName: "Rajesh Mehta", birthdayMessage: "May this year bring you everything your heart desires. Wishing you joy, health, and endless laughter." },
  },
  {
    key: "wedding-ivory",
    label: "Wedding — Ivory",
    data: {
      coupleName: "Arjun & Meera",
      weddingDate: "Sunday, 2 February 2026",
      venue: "The Leela Palace, New Delhi",
      receptionDetails: "Reception follows at 8:00 PM",
      rsvpBy: "15 January 2026",
      hostedBy: "The Kapoor & Nair families",
    },
  },
  {
    key: "wedding-midnight",
    label: "Wedding — Midnight",
    data: {
      coupleName: "Rohan & Anika",
      weddingDate: "Friday, 14 November 2025",
      venue: "ITC Maurya, New Delhi",
      receptionDetails: "Cocktails & dinner to follow",
      rsvpBy: "1 November 2025",
    },
  },
  {
    key: "engagement-rose",
    label: "Engagement — Rose",
    data: {
      coupleName: "Kabir & Simran",
      date: "Saturday, 18 October 2025 · 6:30 PM",
      venue: "Taj Lands End, Bandra, Mumbai",
      hostedBy: "The Malhotra & Singh families",
      note: "Cocktail attire requested",
    },
  },
  {
    key: "party-vivid",
    label: "Party — Vivid",
    data: {
      eventTitle: "Rohan's 25th Birthday Bash!",
      date: "Saturday, 8 March 2025 · 8:00 PM",
      venue: "Skybar Rooftop, Lower Parel, Mumbai",
      hostedBy: "The Kumar family",
      dressCode: "Smart casual",
    },
  },
  {
    key: "business-promo",
    label: "Business — Impact",
    data: { businessName: "Urban Threads", description: "Flat 40% off on all summer collections. Limited stock — shop before it runs out!" },
  },
  {
    key: "business-clean",
    label: "Business — Studio",
    data: { businessName: "Verse & Co.", description: "Introducing our new artisanal coffee blends, sourced direct from Coorg estates. First bag free with any subscription." },
  },
];

function renderPdf(key: string, data: Record<string, unknown>): Buffer {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    registerFonts(doc);
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const render = templateRegistry[key];
    if (!render) { doc.end(); return; }
    render(doc, data);
    doc.end();
  }) as unknown as Buffer;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const specific = process.argv[2];
  const targets = specific ? INVITE_TEMPLATES.filter((t) => t.key === specific) : INVITE_TEMPLATES;

  console.log(`Generating ${targets.length} invite/promo PDF(s)...\n`);
  for (const { key, label, data } of targets) {
    const buf = await (renderPdf(key, data) as unknown as Promise<Buffer>);
    const out = path.join(OUT_DIR, `${key}.pdf`);
    fs.writeFileSync(out, buf);
    console.log(`  ✓ ${label.padEnd(26)} → ${out}`);
  }
  console.log("\nDone. Open preview/index.html to browse.");
}

main().catch(console.error);
