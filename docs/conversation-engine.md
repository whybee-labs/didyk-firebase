# Conversation Engine

The conversation engine is the core of the backend. Every incoming WhatsApp message is routed through it.

---

## Conversation Model

Each user has one active conversation at a time. Users and conversations are one-to-many.

**`users/{phone}`**
```
phone                string   — E.164 format, also the document ID
activeConversationId string | null
totalConversations   number
firstSeenAt          Timestamp
lastSeenAt           Timestamp
```

**`conversations/{conversationId}`** — Firestore auto-generated ID (not stored as a field)
```
phone                string
status               ConversationStatus
useCase              "birthday" | "business" | "event" | undefined
collectedData        Record<string, unknown>   — user-provided form inputs + media IDs
browsePath           string[]                  — navigation trail (e.g. ["cat-memories", "prod-birthdays"])
selectedUseCaseIds   string[]                  — use case IDs chosen at selecting_usecases step
paymentData          { linkId, amount, createdAt, paidAt? } — set during fulfillment
lastMessageAt        Timestamp  — updated on every incoming message (used for idle timeout)
createdAt            Timestamp
updatedAt            Timestamp
```

**`conversations/{conversationId}/messages/{messageId}`** — subcollection, appended on every message (fire-and-forget)

---

## Status State Machine

```
            ┌──────────────┐
  new user  │   discovery  │  ← welcome: popular buttons + browse list
            └──────┬───────┘
                   │ popular product button tapped, or category selected from list
            ┌──────▼───────┐
            │   browsing   │  ← navigating catalog: category → product → use case
            └──────┬───────┘
                   │ product selected
            ┌──────▼───────┐
            │   refining   │  ← LLM collecting fields conversationally (photos, text)
            └──────┬───────┘
                   │ all fields complete
            ┌──────▼────────────┐
            │ selecting_usecases│  ← "What would you like created?" list
            └──────┬────────────┘
                   │ use case selected
            ┌──────▼───────┐
            │  confirming  │  ← summary + [✅ Create it!] [🔄 Start Over] buttons
            └──────┬───────┘
                   │ "Create it!" tapped
            ┌──────▼───────┐
            │  generating  │  ← brief state during output generation
            └──────┬───────┘
                   │ all outputs sent + payment link created
            ┌──────▼──────────┐
            │ awaiting_payment │  ← CTA button sent, waiting for Razorpay payment
            └──────┬──────────┘
                   │ payment_link.paid webhook received
            ┌──────▼───────┐
            │  completed   │
            └──────────────┘

"Start Over" at confirming → resets the same conversation doc back to discovery
(status, useCase, collectedData, browsePath, selectedUseCaseIds cleared — no new document created)

"hi" at any status → same reset (clears all fields, sends welcome again)
```

Note: `form_sent` is a legacy status for WhatsApp Form (nfm_reply) submissions. Not triggered by the current catalog flow.

---

## Message Routing

`handleIncomingMessage.ts` is the entry point for every message.

1. **"hi" shortcut** — if the message text is exactly `"hi"`, reset the conversation to `discovery` regardless of current status (clears `useCase`, `collectedData`, `browsePath`, `selectedUseCaseIds`, `messageHistory`)
2. **Load conversation** — look up `users/{phone}` → get `activeConversationId` → load `conversations/{activeConversationId}`
3. **Create if needed** — create a new conversation (status `"discovery"`) if:
   - no `activeConversationId` on the user, or
   - conversation doesn't exist, or
   - `status === "completed"`, or
   - `lastMessageAt` is more than 8 hours ago
4. **Update timestamps** — `lastSeenAt` on user + `lastMessageAt` on conversation (parallel)
5. **Log message** — append to `conversations/{id}/messages/` subcollection (fire-and-forget)
6. **Route by status**

```ts
switch (conversation.status) {
  case "discovery":           → discovery()
  case "browsing":            → browsing()
  case "form_sent":           → handleFormReply()
  case "refining":            → flowEngine()
  case "selecting_usecases":  → handleUseCaseSelection()
  case "confirming":          → handleConfirmation()
  case "generating":          → "Still working on it, hang tight!"
  case "awaiting_payment":    → "Please complete your payment using the link sent above."
  default:                    → discovery()
}
```

---

## Phase 1 — Discovery

**File:** `services/conversation/discovery.ts`

Triggered when `status === "discovery"`. Sends two messages on any non-actionable input.

**Popular product button tapped (`button_reply`, id starts with `prod-`)**
- Looks up the product in the catalog
- Sets `browsePath: [prodId]`, calls `initiateFlow()` → moves to `refining`

**Category list item selected (`list_reply`, id starts with `cat-`)**
- Sets `status: "browsing"`, `browsePath: [catId]`
- Delegates to `browsing()`

**Anything else** → sends welcome (two messages):
1. **Popular products** — 3 quick-reply buttons (🎂 Birthdays, 🛍️ Business Promos, 🎉 Events)
2. **Browse list** — all 5 categories as a WhatsApp list message (Memories, Invitations, Business, Social Media, Documents)

---

## Phase 2 — Browsing

**File:** `services/conversation/browsing.ts`

Triggered when `status === "browsing"`. Handles catalog navigation.

**Navigation rules:**
- `list_reply` with a `prod-*` id → look up product, call `initiateFlow()` → moves to `refining`
- `list_reply` with a `cat-*` id → update `browsePath: [catId]`, send product list for that category
- Any other message → re-render current level

**`sendCurrentLevel(cid, phone, browsePath)`** — re-renders the catalog level based on the last element of `browsePath`:
- Ends with `cat-*` → send product list for that category
- Ends with `prod-*` → send use case list for that product
- Empty / unknown → fall back to top-level category list

Firestore is updated on every navigation step: `{ status: "browsing", browsePath: [...] }`.

---

## Phase 3 — Refining (Form Collection)

**File:** `services/conversation/flowEngine.ts`

Triggered when `status === "refining"`. Called after product selection (via `initiateFlow`) and on every subsequent message.

**`initiateFlow(phone, conversationId, useCase, browsePath)`** — entry point from browsing:
1. Sets `status: "refining"`, `useCase` on the conversation
2. Calls `flowEngine` with a synthetic empty message to kick off the first question

**Image messages** — handled directly:
- `mediaId` is appended to `collectedData.images` (or the relevant media field)
- Saved to Firestore immediately
- Re-runs the completion check

**Text messages** — go through the LLM:
- Builds a prompt listing all fields + their current values
- LLM returns `{ extractedFields, nextQuestion, isComplete }`
- Saves any extracted fields to Firestore
- If `isComplete === true` → calls `sendUseCaseSelection()`
- Otherwise → sends `nextQuestion` to the user

**LLM completion rule:**
`isComplete = true` only when all required fields are filled AND any media fields have ≥ 1 item in their array.

---

## Phase 4 — Use Case Selection

**File:** `services/conversation/useCaseSelection.ts`

Triggered when refining completes. Sends a list of available use cases for the product.

**`sendUseCaseSelection(phone, conversation)`**:
- Resolves the catalog product from `browsePath` (last `prod-*` element)
- Sends use case list: "Great! Now choose what you'd like created for your {productName}"
- Sets `status: "selecting_usecases"`

**`handleUseCaseSelection(phone, message, conversation)`**:
- `list_reply` → validate use case exists, store `selectedUseCaseIds: [id]`, move to `confirming`, call `sendConfirmation()`
- Other → resend use case list

---

## Phase 5 — Confirmation

**File:** `services/conversation/confirmation.ts`

**`sendConfirmation(phone, conversation)`**
- Gets product config → calls `config.confirmationTemplate(collectedData)` to build summary
- Sets `status: "confirming"`
- Sends summary text + 2 buttons:
  - `✅ Create it!` (id: `"create"`)
  - `🔄 Start Over` (id: `"restart"`)

**`handleConfirmation(phone, message, conversation)`**
- `"create"` → calls `startFulfillment()`
- `"restart"` → resets the same conversation doc in-place: clears `useCase`, `collectedData`, `browsePath`, `selectedUseCaseIds`, sets `status: "discovery"`, calls `discovery()` on the same conversation

---

## Phase 6 — Fulfillment

**File:** `services/conversation/fulfillment.ts`

See [media-generation.md](./media-generation.md) for how outputs are generated and [payment.md](./payment.md) for the payment flow.

1. Sets `status: "generating"`
2. Sends preview message (`"🎬 Here's your preview!"`)
3. Iterates `conversation.selectedUseCaseIds`, looks up each `CatalogUseCase` via `findUseCase(id)`, generates and sends all outputs
4. Creates Razorpay payment link
5. Sends CTA button (`"💳 To receive your final files, please complete payment:"` + `"Complete Payment"` button)
6. Sets `status: "awaiting_payment"`, stores `paymentData: { linkId, amount, createdAt }`

---

## Start Over

"Start Over" button in confirmation resets the **same conversation document** without creating a new one:
1. Update doc: `status: "discovery"`, clear `useCase`, `collectedData`, `browsePath`, `selectedUseCaseIds`
2. Call `discovery()` on the reset conversation (sends welcome messages)

Sending `"hi"` performs the same reset from any state.
