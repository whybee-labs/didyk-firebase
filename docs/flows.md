# Products & Catalog

Products are the core abstraction that defines what data to collect, what to charge, and how to deliver output.

---

## Catalog Hierarchy

Three levels, always strict:

```
CatalogCategory  (e.g. Memories)
  └── CatalogProduct  (e.g. Birthdays)           ← browsable node
       └── CatalogUseCase  (e.g. Birthday Video)  ← leaf; drives output generation
```

**File:** `config/catalog/`

- `catalog: CatalogCategory[]` — full 5-category tree (Memories, Invitations, Business, Social Media, Documents)
- `popularProducts()` — the 3 products marked `popular: true` (shown as welcome buttons)
- Lookups: `findCategory(id)`, `findProduct(id)`, `findUseCase(id)`

**Types** (`config/catalog/types.ts` + `config/products/types.ts`):

```ts
interface CatalogCategory {
  id: string;           // "cat-memories", "cat-business", etc.
  label: string;
  description: string;
  products: CatalogProduct[];
}

interface CatalogProduct {
  id: string;           // "prod-birthdays", "prod-events", etc.
  label: string;
  description: string;
  popular?: boolean;            // top 3 → shown as welcome quick-reply buttons
  productConfigId?: UseCase;    // links to ProductConfig; absent = coming soon
  useCases: CatalogUseCase[];
}

interface CatalogUseCase {
  id: string;           // "uc-birthday-video", "uc-party-invite", etc.
  label: string;
  description: string;
  outputs: UseCaseOutput[];     // what gets generated & sent at fulfillment
}
```

---

## ProductConfig Schema

**File:** `config/products/types.ts`

```ts
interface ProductConfig {
  id: "birthday" | "business" | "event";
  name: string;           // human-readable, used in messages and payment description
  description: string;    // used in LLM prompts
  waFlowId: string;       // Meta WhatsApp Flow ID (set in Meta dashboard; unused in default flow)
  openingPrompt: string;  // single open invitation sent at the start of refining
  fields: ProductField[]; // what data to collect
  useCases: CatalogUseCase[]; // canonical use cases for this product
  confirmationTemplate: (data: Record<string, unknown>) => string;
  pricing: { INR: number; USD: number };
}
```

**Note:** `outputs` are now on `CatalogUseCase`, not `ProductConfig`. Fulfillment iterates `selectedUseCaseIds`, looks up each `CatalogUseCase` via `findUseCase(id)`, and generates its outputs.

---

## ProductField

Defines a single data point to collect from the user.

```ts
interface ProductField {
  key: string;        // key in collectedData (e.g. "recipientName")
  type: "text" | "media";
  required: boolean;
  label: string;      // shown in LLM prompts and confirmation summary
  formKey?: string;   // maps to the nfm_reply JSON field name (form fields only)
}
```

- All fields are collected conversationally via the LLM (one-shot extraction from `openingPrompt` response)
- `formKey` is retained for products that opt into WhatsApp Forms — not used in the default flow
- `required: false` fields (like optional photos) don't block completion

---

## UseCaseOutput

Defines one piece of output to generate and send to the user at fulfillment.

```ts
type OutputType = "video" | "image" | "pdf" | "audio" | "text";

interface UseCaseOutput {
  type: OutputType;
  generate: (data: Record<string, unknown>) => Promise<string>;
  // Returns: URL (for video/image/pdf/audio) or message string (for text)
}
```

Outputs are sent **in order** — put media before text.

---

## Current Products

### Birthday (`config/products/birthday.ts`)

| Field | Type | Label |
|-------|------|-------|
| `recipientName` | text | Recipient's name |
| `birthdayMessage` | text | Birthday message or wishes |
| `images` | media | Photos of the birthday person (1–3) |

**Price:** ₹199 / $5

### Business Promos (`config/products/business.ts`)

| Field | Type | Label |
|-------|------|-------|
| `businessName` | text | Business name |
| `description` | text | Promotion description |
| `images` | media | Product or logo photos (1–3) |

**Price:** ₹299 / $7

### Event (`config/products/event.ts`)

| Field | Type | Label |
|-------|------|-------|
| `eventName` | text | Event name |
| `dateTime` | text | Date and time |
| `venue` | text | Venue or location |
| `images` | media | Photos or banner (optional) |

**Price:** ₹249 / $6

---

## Catalog: Popular Products

These products appear as quick-reply buttons on the welcome screen (bypass category browsing):

| id | label |
|----|-------|
| `prod-birthdays` | 🎂 Birthdays |
| `prod-business-promos` | 🛍️ Business Promos |
| `prod-events` | 🎉 Events |

---

## Adding a New Product

1. **Create** `config/products/yourproduct.ts` — implement `ProductConfig` (set `openingPrompt`, `fields`, `useCases`, `confirmationTemplate`, `pricing`)
2. **Add** to `config/products/index.ts` — add to `productMap` and `UseCase` type
3. **Add catalog entries** in `config/catalog/index.ts` — add to the relevant `CatalogCategory.products` array with appropriate `CatalogUseCase[]`
4. Generators are shared — reuse existing ones in `services/generators/`

No Meta Form approval needed — all field collection is conversational via the LLM.

---

## WhatsApp Forms (optional)

WhatsApp Forms (nfm_reply) are supported for products that warrant a native structured UI, but are **not used by default**. The default flow uses one-shot LLM extraction via `openingPrompt`.

`waFlowId` is still present on `ProductConfig` for products that opt into Forms. Current values are placeholders (`BIRTHDAY_FLOW_ID_PLACEHOLDER`, etc.) and can be ignored unless you explicitly trigger `sendFlow()`.
