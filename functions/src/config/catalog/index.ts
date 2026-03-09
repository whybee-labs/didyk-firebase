import { generateVideo } from "services/generators/videoGenerator";
import { generateText } from "services/generators/textGenerator";
import { generateImage } from "services/generators/imageGenerator";
import { generatePdf } from "services/generators/pdfGenerator";
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
          },
          {
            id: "uc-photo-collage",
            label: "Photo Collage",
            description: "A photo collage with a personalised message",
          },
        ],
      },
      {
        id: "prod-anniversaries",
        label: "💍 Anniversaries",
        description: "Mark milestones and special moments",
        useCases: [
          {
            id: "uc-anniversary-video",
            label: "Anniversary Video",
            description: "A heartfelt anniversary video",
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
        useCases: [
          {
            id: "uc-event-invite",
            label: "Event Invite",
            description: "A video invite with event details and photos",
            outputs: [
              { type: "video", generate: generateVideo },
              { type: "pdf", generate: generatePdf },
            ],
          },
          {
            id: "uc-event-card",
            label: "Event Card",
            description: "A digital event invitation card",
          },
        ],
      },
      {
        id: "prod-weddings",
        label: "💒 Weddings",
        description: "Wedding invites and announcements",
        useCases: [
          {
            id: "uc-wedding-invite",
            label: "Wedding Invite",
            description: "An elegant wedding invitation",
          },
        ],
      },
    ],
  },
  {
    id: "cat-business",
    label: "Business Promotions",
    description: "Promos, launches & announcements",
    products: [
      {
        id: "prod-business-promos",
        label: "🛍️ Business Promos",
        description: "Promote your shop or business",
        popular: true,
        productConfigId: "shop",
        useCases: [
          {
            id: "uc-shop-promo-poster",
            label: "Promo Poster",
            description: "An eye-catching promotional poster",
            outputs: [
              { type: "image", generate: generateImage },
              { type: "text", generate: generateText },
            ],
          },
          {
            id: "uc-shop-promo-video",
            label: "Promo Video",
            description: "A short promotional video for your business",
          },
        ],
      },
      {
        id: "prod-product-launch",
        label: "🚀 Product Launch",
        description: "Announce a new product or service",
        useCases: [
          {
            id: "uc-product-launch",
            label: "Launch Announcement",
            description: "A compelling product launch announcement",
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
        id: "prod-social-media",
        label: "📱 Social Media",
        description: "Content for your social channels",
        useCases: [
          {
            id: "uc-instagram-post",
            label: "Instagram Post",
            description: "A polished square post for Instagram",
          },
          {
            id: "uc-whatsapp-status",
            label: "WhatsApp Status",
            description: "An eye-catching status update",
          },
          {
            id: "uc-reels",
            label: "Reels",
            description: "A short-form vertical video",
          },
          {
            id: "uc-quote-poster",
            label: "Quote Poster",
            description: "A beautifully designed quote card",
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
        id: "prod-documents",
        label: "📄 Documents",
        description: "Print-ready and digital documents",
        useCases: [
          {
            id: "uc-flyer",
            label: "Flyer",
            description: "A promotional flyer for any occasion",
          },
          {
            id: "uc-event-poster",
            label: "Event Poster",
            description: "A striking event poster",
          },
          {
            id: "uc-brochure",
            label: "Brochure",
            description: "A professional brochure or lookbook",
          },
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
