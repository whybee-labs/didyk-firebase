# Flow Configuration

Flows are the core abstraction that defines everything about a use case — what data to collect, how to collect it, what to output, and what to charge.

---

## FlowConfig Schema

**File:** `config/flows/types.ts`

```ts
interface FlowConfig {
  id: "birthday" | "shop" | "event";
  name: string;           // human-readable, used in messages and payment description
  description: string;    // used in LLM intent detection prompt
  waFlowId: string;       // Meta WhatsApp Flow ID (set in Meta dashboard)
  fields: FlowField[];    // what data to collect
  outputs: FlowOutput[];  // what to generate and send after confirmation
  confirmationTemplate: (data: Record<string, unknown>) => string;
  pricing: { amount: number; currency: "INR" };  // amount in INR
}
```

---

## FlowField

Defines a single data point to collect from the user.

```ts
interface FlowField {
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

## FlowOutput

Defines one piece of output to generate and send to the user at fulfillment.

```ts
type OutputType = "video" | "image" | "pdf" | "audio" | "text";

interface FlowOutput {
  type: OutputType;
  generate: (data: Record<string, unknown>) => Promise<string>;
  // Returns: URL (for video/image/pdf/audio) or message string (for text)
}
```

Outputs are sent **in order** — put media before text.

---

## Current Flows

### Birthday (`config/flows/birthday.ts`)

| Field | Type | Via | Label |
|-------|------|-----|-------|
| `recipientName` | text | Form | Recipient's name |
| `birthdayMessage` | text | Form | Birthday message or wishes |
| `images` | media | LLM | Photos of the birthday person (1–3) |

**Outputs:** video → text (personalized message via OpenAI)
**Price:** ₹199

---

### Shop Promo (`config/flows/shop.ts`)

| Field | Type | Via | Label |
|-------|------|-----|-------|
| `shopName` | text | Form | Shop name |
| `description` | text | Form | Promotion description |
| `images` | media | LLM | Product or logo photos (1–3) |

**Outputs:** image → text (promo caption via OpenAI)
**Price:** ₹299

---

### Event Invite (`config/flows/event.ts`)

| Field | Type | Via | Label |
|-------|------|-----|-------|
| `eventName` | text | Form | Event name |
| `dateTime` | text | Form | Date and time |
| `venue` | text | Form | Venue or location |
| `images` | media | LLM | Photos or banner (optional) |

**Outputs:** video → pdf (event flyer)
**Price:** ₹249

---

## Adding a New Flow

1. **Create** `config/flows/yourflow.ts` — implement `FlowConfig`
2. **Add** to `config/flows/index.ts` — add to the `flows` map and `UseCase` type
3. **Add** discovery button in `services/conversation/discovery.ts` — add button + intent detection
4. **Create WhatsApp Form** in Meta dashboard → paste the Flow ID into `waFlowId`
5. Generators are shared — reuse existing ones or create new ones in `services/generators/`

---

## WhatsApp Forms

Each flow sends a WhatsApp Form (nfm_reply) to collect text fields in one shot.
The `waFlowId` must be a real Flow ID from the Meta dashboard.

Current placeholders:
- `BIRTHDAY_FLOW_ID_PLACEHOLDER`
- `SHOP_FLOW_ID_PLACEHOLDER`
- `EVENT_FLOW_ID_PLACEHOLDER`

Replace these once Forms are created in Meta.

The form's field names must match the `formKey` values in the flow's `fields` array.
