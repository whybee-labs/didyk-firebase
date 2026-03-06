# Conversation Engine

The conversation engine is the core of the backend. Every incoming WhatsApp message is routed through it.

---

## Session Model

Each user gets one active session at a time. Sessions are stored as separate documents — users and conversations are one-to-many.

**`users/{phone}`**
```
phone          string   — E.164 format, also the document ID
activeSessionId  string | null
totalSessions  number
firstSeenAt    Timestamp
lastSeenAt     Timestamp
```

**`conversations/{sessionId}`** — Firestore auto-generated ID
```
sessionId      string   — same as document ID
phone          string
status         ConversationStatus
useCase        "birthday" | "shop" | "event" | undefined
collectedData  Record<string, unknown>   — all collected fields + paymentLinkId
lastMessageAt  Timestamp  — updated on every incoming message (used for idle timeout)
createdAt      Timestamp
updatedAt      Timestamp
```

**`conversations/{sessionId}/messages/{messageId}`** — subcollection, appended on every message (fire-and-forget)

---

## Status State Machine

```
            ┌──────────────┐
  new user  │   discovery  │
            └──────┬───────┘
                   │ button tap or LLM detects intent
            ┌──────▼───────┐
            │  form_sent   │ ← WhatsApp Form sent, waiting for nfm_reply
            └──────┬───────┘
                   │ form submitted
            ┌──────▼───────┐
            │   refining   │ ← LLM filling remaining fields conversationally
            └──────┬───────┘
                   │ all fields complete
            ┌──────▼───────┐
            │  confirming  │ ← summary + [Create it!] [Start Over] buttons
            └──────┬───────┘
                   │ "Create it!" tapped
            ┌──────▼───────┐
            │  generating  │ ← brief state during output generation
            └──────┬───────┘
                   │ all outputs sent + payment link created
            ┌──────▼──────────┐
            │ awaiting_payment │ ← waiting for Razorpay payment
            └──────┬──────────┘
                   │ payment_link.paid webhook received
            ┌──────▼───────┐
            │  completed   │
            └──────────────┘

"Start Over" at confirming → resets the same conversation doc back to discovery
(status, useCase, collectedData cleared — no new document created)
```

---

## Message Routing

`handleIncomingMessage.ts` is the entry point for every message.

1. **Load session** — look up `users/{phone}` → get `activeSessionId` → load `conversations/{activeSessionId}`
2. **Create if needed** — create a new session (status `"discovery"`) if:
   - no `activeSessionId` on the user, or
   - conversation doesn't exist, or
   - `status === "completed"`, or
   - `lastMessageAt` is more than 8 hours ago
3. **Update timestamps** — `lastSeenAt` on user + `lastMessageAt` on conversation (parallel)
4. **Log message** — append to `conversations/{id}/messages/` subcollection (fire-and-forget)
5. **Route by status**

```ts
switch (session.status) {
  case "discovery":        → discovery()
  case "form_sent":        → handleFormReply()
  case "refining":         → flowEngine()
  case "confirming":       → handleConfirmation()
  case "generating":       → "Still generating, hang tight!"
  case "awaiting_payment": → "Please complete your payment using the link sent above."
}
```

---

## Phase 1 — Discovery

**File:** `services/conversation/discovery.ts`

Triggered when `status === "discovery"`. Runs on every message until an intent (use case) is detected.

**Button tap (`button_reply`)**
- Maps `buttonId` → useCase directly (`birthday`, `shop`, `event`)
- Calls `initiateFlow()` → sets `useCase`, `status: "form_sent"`, sends WhatsApp Form

**Free text**
- Calls OpenAI (`gpt-4.1-nano`) with the user's message
- Prompt asks LLM to identify intent as one of: `birthday`, `shop`, `event`, or `unknown`
- If recognized → `initiateFlow()`
- If unknown → send welcome message again with buttons

**Welcome message** includes:
- Brief intro to Whybee
- 3 quick-reply buttons: Birthday Video / Shop Promo / Event Invite

---

## Phase 2 — Form Collection

**Handled in:** `handleIncomingMessage.ts` → `handleFormReply()`

Triggered when `status === "form_sent"` and message `type === "form_reply"`.

WhatsApp Forms (nfm_reply) submit a JSON blob. This phase maps the form fields to `collectedData` using `field.formKey`.

If the message is not a `form_reply` (e.g. user sent a text while form is open) → "Please complete the form first 📋"

After mapping:
- Sets `status: "refining"`
- Calls `flowEngine()` so it can ask for remaining fields (usually images)

---

## Phase 3 — LLM Refinement

**File:** `services/conversation/flowEngine.ts`

Triggered when `status === "refining"`. Called after form submission and on every subsequent message.

**Image messages** — handled directly:
- `mediaId` is appended to `collectedData.images` (or the relevant media field)
- Saved to Firestore immediately
- Re-runs the completion check

**Text messages** — go through the LLM:
- Builds a prompt listing all fields + their current values
- LLM returns `{ extractedFields, nextQuestion, isComplete }`
- Saves any extracted fields to Firestore
- If `isComplete === true` → calls `sendConfirmation()`
- Otherwise → sends `nextQuestion` to the user

**LLM completion rule:**
`isComplete = true` only when all required fields are filled AND any media fields have ≥ 1 item in their array.

---

## Phase 4 — Confirmation

**File:** `services/conversation/confirmation.ts`

**`sendConfirmation(phone, session)`**
- Gets flow config → calls `config.confirmationTemplate(collectedData)` to build summary
- Sets `status: "confirming"`
- Sends summary text + 2 buttons:
  - `✅ Create it!` (id: `"create"`)
  - `🔄 Start Over` (id: `"restart"`)

**`handleConfirmation(phone, message, session)`**
- `"create"` → calls `startFulfillment()`
- `"restart"` → resets the same conversation doc in-place: clears `useCase`, `collectedData`, sets `status: "discovery"`, calls `discovery()` on the same session

---

## Phase 5 — Fulfillment

**File:** `services/conversation/fulfillment.ts`

See [media-generation.md](./media-generation.md) for how outputs are generated and [payment.md](./payment.md) for the payment flow.

After all outputs are sent and the payment link is delivered:
- `status` → `"awaiting_payment"`
- `collectedData.paymentLinkId` → Razorpay payment link ID (for webhook lookup)

---

## Start Over

"Start Over" button in confirmation resets the **same conversation document** without creating a new one:
1. Update doc: `status: "discovery"`, `useCase: null`, `collectedData: {}`
2. Call `discovery()` on the reset session (sends welcome message)

There are no reset commands. Any message during an active session continues from wherever it left off.
