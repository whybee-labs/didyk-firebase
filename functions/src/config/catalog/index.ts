import { generateVideo } from "services/generators/videoGenerator";
import { generateImage } from "services/generators/imageGenerator";
import { generatePdf } from "services/generators/pdfGenerator";
import { generateText } from "services/generators/textGenerator";
import { birthdayProduct } from "config/products/birthday";
import { businessProduct } from "config/products/business";
import { CatalogCategory, CatalogProduct, CatalogUseCase } from "./types";

const pdf = (template: string) => (data: Record<string, unknown>) => generatePdf({ ...data, _template: template });

export const catalog: CatalogCategory[] = [
  {
    id: "cat-memories",
    label: "Memories",
    description: "Birthdays, anniversaries, weddings & more",
    products: [
      {
        id: "prod-birthdays",
        label: "🎂 Birthdays",
        description: "Celebrate someone special",
        popular: true,
        productConfigId: "birthday",
        useCases: [
          ...birthdayProduct.useCases,
          { id: "uc-birthday-bloom",  label: "Birthday Card — Bloom",  description: "Pink floral card with name & personal message",   outputs: [{ type: "pdf" as const, generate: pdf("birthday-invite") }] },
          { id: "uc-birthday-golden", label: "Birthday Card — Golden", description: "Classic cream & gold card, timeless and elegant",   outputs: [{ type: "pdf" as const, generate: pdf("birthday-golden") }] },
        ],
      },
      {
        id: "prod-anniversaries",
        label: "💍 Anniversaries",
        description: "Mark milestones and special moments",
        productConfigId: "birthday",
        useCases: [
          { id: "uc-anniversary-video", label: "Anniversary Video", description: "A heartfelt anniversary video",         outputs: [{ type: "video", generate: generateVideo }] },
          { id: "uc-anniversary-card",  label: "Anniversary Card",  description: "A beautiful digital anniversary card", outputs: [{ type: "image", generate: generateImage }] },
        ],
      },
    ],
  },
  {
    id: "cat-invitations",
    label: "Invitations",
    description: "Weddings, engagements, events & parties",
    products: [
      {
        id: "prod-weddings",
        label: "💒 Weddings",
        description: "Elegant wedding invitations",
        productConfigId: "wedding",
        useCases: [
          { id: "uc-wedding-ivory",    label: "Ivory Classic",   description: "Elegant ivory & gold, serif typography",  outputs: [{ type: "pdf" as const, generate: pdf("wedding-ivory") }] },
          { id: "uc-wedding-midnight", label: "Midnight Luxe",   description: "Dark and dramatic with gold accents",     outputs: [{ type: "pdf" as const, generate: pdf("wedding-midnight") }] },
        ],
      },
      {
        id: "prod-engagements",
        label: "💍 Engagements",
        description: "Romantic engagement invitations",
        productConfigId: "engagement",
        useCases: [
          { id: "uc-engagement-rose", label: "Rose Romance", description: "Soft blush pink, romantic and elegant", outputs: [{ type: "pdf" as const, generate: pdf("engagement-rose") }] },
        ],
      },
      {
        id: "prod-events",
        label: "🎉 Events",
        description: "Invite people to your event",
        popular: true,
        productConfigId: "event",
        useCases: [
          { id: "uc-event-midnight", label: "Midnight",   description: "Navy & gold, formal and elegant",           outputs: [{ type: "pdf" as const, generate: pdf("event-invite") }] },
          { id: "uc-event-modern",   label: "Modern",     description: "Indigo/violet, contemporary and bold",      outputs: [{ type: "pdf" as const, generate: pdf("event-modern") }] },
          { id: "uc-event-video",    label: "Event Video",description: "A video invite with event details",         outputs: [{ type: "video", generate: generateVideo }] },
        ],
      },
      {
        id: "prod-parties",
        label: "🥳 Parties",
        description: "Birthday parties, housewarmings & celebrations",
        productConfigId: "party",
        useCases: [
          { id: "uc-party-vivid", label: "Vivid Party", description: "Bold & colourful, dark background, high energy", outputs: [{ type: "pdf" as const, generate: pdf("party-vivid") }] },
          { id: "uc-party-video", label: "Party Video", description: "A fun party invitation video",                   outputs: [{ type: "video", generate: generateVideo }] },
        ],
      },
    ],
  },
  {
    id: "cat-business",
    label: "Business",
    description: "Promos, launches & announcements",
    products: [
      {
        id: "prod-business-promos",
        label: "🛍️ Business Promos",
        description: "Promote your business",
        productConfigId: "business",
        useCases: businessProduct.useCases,
      },
      {
        id: "prod-product-launch",
        label: "🚀 Product Launch",
        description: "Announce a new product or service",
        productConfigId: "business",
        useCases: [
          { id: "uc-launch-video",  label: "Launch Video",  description: "A punchy product launch video", outputs: [{ type: "video", generate: generateVideo }] },
          { id: "uc-launch-poster", label: "Launch Poster", description: "A bold product launch poster",  outputs: [{ type: "image", generate: generateImage }] },
        ],
      },
    ],
  },
  {
    id: "cat-social",
    label: "Social Media",
    description: "Posts, reels & story cards",
    products: [
      {
        id: "prod-instagram",
        label: "📸 Instagram",
        description: "Feed posts, reels & stories",
        productConfigId: "business",
        useCases: [
          { id: "uc-instagram-post",  label: "Feed Post",   description: "A polished square post for your feed", outputs: [{ type: "image", generate: generateImage }] },
          { id: "uc-instagram-reel",  label: "Reel",        description: "A short-form vertical video",          outputs: [{ type: "video", generate: generateVideo }] },
          { id: "uc-instagram-story", label: "Story Card",  description: "An eye-catching story graphic",        outputs: [{ type: "image", generate: generateImage }] },
        ],
      },
      {
        id: "prod-whatsapp-status",
        label: "💬 WhatsApp Status",
        description: "Status updates and broadcasts",
        productConfigId: "business",
        useCases: [
          { id: "uc-status-image", label: "Status Image", description: "A striking image for your status",     outputs: [{ type: "image", generate: generateImage }] },
          { id: "uc-status-video", label: "Status Video", description: "A short video for your status",        outputs: [{ type: "video", generate: generateVideo }] },
          { id: "uc-quote-poster", label: "Quote Poster", description: "A beautifully designed quote card",    outputs: [{ type: "image", generate: generateImage }] },
        ],
      },
    ],
  },
  {
    id: "cat-documents",
    label: "Documents",
    description: "Flyers, posters & brochures",
    products: [
      {
        id: "prod-flyers",
        label: "📄 Flyers & Posters",
        description: "Print-ready promotional materials",
        productConfigId: "business",
        useCases: [
          { id: "uc-flyer-impact", label: "Flyer — Impact", description: "Bold dark design, strong headline",     outputs: [{ type: "image", generate: generateImage }, { type: "pdf" as const, generate: pdf("business-promo") }] },
          { id: "uc-flyer-clean",  label: "Flyer — Studio", description: "Clean minimal white, professional",    outputs: [{ type: "image", generate: generateImage }, { type: "pdf" as const, generate: pdf("business-clean") }] },
        ],
      },
      {
        id: "prod-brochures",
        label: "📋 Brochures",
        description: "Professional brochures and lookbooks",
        productConfigId: "business",
        useCases: [
          { id: "uc-brochure", label: "Brochure", description: "A professional brochure or lookbook", outputs: [{ type: "pdf" as const, generate: pdf("business-clean") }, { type: "text", generate: generateText }] },
        ],
      },
    ],
  },
  {
    id: "cat-career",
    label: "Career",
    description: "Resumes, CVs & cover letters",
    products: [
      {
        id: "prod-student-resume",
        label: "📄 Student Resume",
        description: "Land your next internship or job",
        popular: true,
        productConfigId: "resume",
        useCases: [
          { id: "uc-resume-astralis",  label: "Astralis",  description: "Two-column, green accent, skill badges",    outputs: [{ type: "pdf" as const, generate: pdf("astralis") }] },
          { id: "uc-resume-nebula",    label: "Nebula",    description: "Navy header with a clean light sidebar",    outputs: [{ type: "pdf" as const, generate: pdf("nebula") }] },
          { id: "uc-resume-celestial", label: "Celestial", description: "Full-height navy sidebar, white main area", outputs: [{ type: "pdf" as const, generate: pdf("celestial") }] },
          { id: "uc-resume-cosmos",    label: "Cosmos",    description: "Dark charcoal header, single-column body",  outputs: [{ type: "pdf" as const, generate: pdf("cosmos") }] },
          { id: "uc-resume-aurora",    label: "Aurora",    description: "Pink/blush gradient header, two-column",    outputs: [{ type: "pdf" as const, generate: pdf("aurora") }] },
          { id: "uc-resume-eclipse",   label: "Eclipse",   description: "Single-column, centered serif name",        outputs: [{ type: "pdf" as const, generate: pdf("eclipse") }] },
          { id: "uc-resume-solstice",  label: "Solstice",  description: "Ultra-minimal, serif, no color",            outputs: [{ type: "pdf" as const, generate: pdf("solstice") }] },
          { id: "uc-resume-ats",       label: "ATS",       description: "Single-column, ATS-optimised for job apps", outputs: [{ type: "pdf" as const, generate: pdf("ats") }] },
        ],
      },
    ],
  },
];

export function popularProducts(): CatalogProduct[] {
  return catalog.flatMap((cat) => cat.products).filter((p) => p.popular);
}

export function findCategory(id: string): CatalogCategory | null {
  return catalog.find((c) => c.id === id) ?? null;
}

export function findProduct(id: string): CatalogProduct | null {
  return catalog.flatMap((cat) => cat.products).find((p) => p.id === id) ?? null;
}

export function findUseCase(id: string): CatalogUseCase | null {
  return catalog
    .flatMap((cat) => cat.products)
    .flatMap((p) => p.useCases)
    .find((uc) => uc.id === id) ?? null;
}

export { CatalogCategory, CatalogProduct, CatalogUseCase };
