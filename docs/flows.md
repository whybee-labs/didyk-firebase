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
  waFlowId: string;       // Meta WhatsApp Flow ID (set in Meta dashboard)
  fields: ProductField[]; // what data to collect
  useCases: CatalogUseCase[]; // canonical use cases for this product
  confirmationTemplate: (data: Record<string, unknown>) => string;
  pricing: { amount: number; currency: "INR" };  // amount in INR
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

- Fields with `formKey` are collected via the WhatsApp Form (nfm_reply)
- Fields without `formKey` (usually `type: "media"`) are collected conversationally via the LLM engine
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

| Field | Type | Via | Label |
|-------|------|-----|-------|
| `recipientName` | text | Form | Recipient's name |
| `birthdayMessage` | text | Form | Birthday message or wishes |
| `images` | media | LLM | Photos of the birthday person (1–3) |

**Price:** ₹199

### Business Promos (`config/products/business.ts`)

| Field | Type | Via | Label |
|-------|------|-----|-------|
| `shopName` | text | Form | Shop / business name |
| `description` | text | Form | Promotion description |
| `images` | media | LLM | Product or logo photos (1–3) |

**Price:** ₹299

### Event (`config/products/event.ts`)

| Field | Type | Via | Label |
|-------|------|-----|-------|
| `eventName` | text | Form | Event name |
| `dateTime` | text | Form | Date and time |
| `venue` | text | Form | Venue or location |
| `images` | media | LLM | Photos or banner (optional) |

**Price:** ₹249

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

1. **Create** `config/products/yourproduct.ts` — implement `ProductConfig`
2. **Add** to `config/products/index.ts` — add to `productMap` and `UseCase` type
3. **Add catalog entries** in `config/catalog/index.ts` — add to the relevant `CatalogCategory.products` array with appropriate `CatalogUseCase[]`
4. **Create WhatsApp Form** in Meta dashboard → paste the Flow ID into `waFlowId`
5. Generators are shared — reuse existing ones in `services/generators/`

---

## WhatsApp Forms

Each product sends a WhatsApp Form (nfm_reply) to collect text fields in one shot.
The `waFlowId` must be a real Flow ID from the Meta dashboard.

Current placeholders:
- `BIRTHDAY_FLOW_ID_PLACEHOLDER`
- `BUSINESS_FLOW_ID_PLACEHOLDER`
- `EVENT_FLOW_ID_PLACEHOLDER`

Replace these once Forms are created in Meta.

The form's field names must match the `formKey` values in the product's `fields` array.
