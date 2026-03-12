import { generateVideo } from "services/generators/videoGenerator";
import { generateImage } from "services/generators/imageGenerator";
import { generatePdf } from "services/generators/pdfGenerator";
import { generateText } from "services/generators/textGenerator";
import { birthdayProduct } from "config/products/birthday";
import { businessProduct } from "config/products/business";
import { eventProduct } from "config/products/event";
import { CatalogCategory, CatalogProduct, CatalogUseCase } from "./types";

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
        useCases: birthdayProduct.useCases,
      },
      {
        id: "prod-anniversaries",
        label: "💍 Anniversaries",
        description: "Mark milestones and special moments",
        productConfigId: "birthday",
        useCases: [
          {
            id: "uc-anniversary-video",
            label: "Anniversary Video",
            description: "A heartfelt anniversary video",
            outputs: [{ type: "video", generate: generateVideo }],
          },
          {
            id: "uc-anniversary-card",
            label: "Anniversary Card",
            description: "A beautiful digital anniversary card",
            outputs: [{ type: "image", generate: generateImage }],
          },
        ],
      },
      {
        id: "prod-weddings",
        label: "💒 Weddings",
        description: "Wedding invites and announcements",
        productConfigId: "birthday",
        useCases: [
          {
            id: "uc-wedding-invite",
            label: "Wedding Invite",
            description: "An elegant wedding invitation video",
            outputs: [
              { type: "video", generate: generateVideo },
              { type: "pdf", generate: (data) => generatePdf({ ...data, _template: "birthday-invite" }) },
            ],
          },
          {
            id: "uc-wedding-card",
            label: "Wedding Card",
            description: "A digital wedding invitation card",
            outputs: [{ type: "image", generate: generateImage }],
          },
        ],
      },
    ],
  },
  {
    id: "cat-invitations",
    label: "Invitations",
    description: "Events, weddings, parties & more",
    products: [
      {
        id: "prod-events",
        label: "🎉 Events",
        description: "Invite people to your event",
        popular: true,
        productConfigId: "event",
        useCases: eventProduct.useCases,
      },
      {
        id: "prod-parties",
        label: "🥳 Parties",
        description: "Birthday parties, housewarmings & celebrations",
        productConfigId: "event",
        useCases: [
          {
            id: "uc-party-invite",
            label: "Party Invite",
            description: "A fun party invitation video",
            outputs: [{ type: "video", generate: generateVideo }],
          },
          {
            id: "uc-party-card",
            label: "Party Card",
            description: "A colourful digital party invite card",
            outputs: [{ type: "image", generate: generateImage }],
          },
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
          {
            id: "uc-launch-video",
            label: "Launch Video",
            description: "A punchy product launch video",
            outputs: [{ type: "video", generate: generateVideo }],
          },
          {
            id: "uc-launch-poster",
            label: "Launch Poster",
            description: "A bold product launch poster",
            outputs: [{ type: "image", generate: generateImage }],
          },
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
          {
            id: "uc-instagram-post",
            label: "Feed Post",
            description: "A polished square post for your feed",
            outputs: [{ type: "image", generate: generateImage }],
          },
          {
            id: "uc-instagram-reel",
            label: "Reel",
            description: "A short-form vertical video",
            outputs: [{ type: "video", generate: generateVideo }],
          },
          {
            id: "uc-instagram-story",
            label: "Story Card",
            description: "An eye-catching story graphic",
            outputs: [{ type: "image", generate: generateImage }],
          },
        ],
      },
      {
        id: "prod-whatsapp-status",
        label: "💬 WhatsApp Status",
        description: "Status updates and broadcasts",
        productConfigId: "business",
        useCases: [
          {
            id: "uc-status-image",
            label: "Status Image",
            description: "A striking image for your status",
            outputs: [{ type: "image", generate: generateImage }],
          },
          {
            id: "uc-status-video",
            label: "Status Video",
            description: "A short video for your status",
            outputs: [{ type: "video", generate: generateVideo }],
          },
          {
            id: "uc-quote-poster",
            label: "Quote Poster",
            description: "A beautifully designed quote card",
            outputs: [{ type: "image", generate: generateImage }],
          },
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
          {
            id: "uc-flyer",
            label: "Flyer",
            description: "A promotional flyer for any occasion",
            outputs: [
              { type: "image", generate: generateImage },
              { type: "pdf", generate: (data) => generatePdf({ ...data, _template: "business-promo" }) },
            ],
          },
          {
            id: "uc-poster",
            label: "Poster",
            description: "A large-format event or promo poster",
            outputs: [
              { type: "image", generate: generateImage },
              { type: "pdf", generate: (data) => generatePdf({ ...data, _template: "business-promo" }) },
            ],
          },
        ],
      },
      {
        id: "prod-brochures",
        label: "📋 Brochures",
        description: "Professional brochures and lookbooks",
        productConfigId: "business",
        useCases: [
          {
            id: "uc-brochure",
            label: "Brochure",
            description: "A professional brochure or lookbook",
            outputs: [
              { type: "pdf", generate: (data) => generatePdf({ ...data, _template: "business-promo" }) },
              { type: "text", generate: generateText },
            ],
          },
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
          { id: "uc-resume-astralis",  label: "Astralis",  description: "Two-column, green accent, skill badges",      outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "astralis" }) }] },
          { id: "uc-resume-nebula",    label: "Nebula",    description: "Navy header with a clean light sidebar",      outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "nebula" }) }] },
          { id: "uc-resume-celestial", label: "Celestial", description: "Full-height navy sidebar, white main area",   outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "celestial" }) }] },
          { id: "uc-resume-cosmos",    label: "Cosmos",    description: "Dark charcoal header, single-column body",    outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "cosmos" }) }] },
          { id: "uc-resume-aurora",    label: "Aurora",    description: "Pink/blush gradient header, two-column",      outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "aurora" }) }] },
          { id: "uc-resume-eclipse",   label: "Eclipse",   description: "Single-column, centered serif name",          outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "eclipse" }) }] },
          { id: "uc-resume-solstice",  label: "Solstice",  description: "Ultra-minimal, serif, no color",              outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "solstice" }) }] },
          { id: "uc-resume-ats",       label: "ATS",       description: "Single-column, ATS-optimised for job apps",   outputs: [{ type: "pdf" as const, generate: (data) => generatePdf({ ...data, _template: "ats" }) }] },
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
