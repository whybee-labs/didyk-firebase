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
createdAt      Timestamp
updatedAt      Timestamp
```

---

## Status State Machine

```
            ┌──────────────┐
  new user  │   discovery  │ ← reset commands always land here
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

"Start Over" at confirming → cancelled → new discovery session
```

---

## Message Routing

`handleIncomingMessage.ts` is the entry point for every message.

1. **Load session** — look up `users/{phone}` → get `activeSessionId` → load `conversations/{activeSessionId}`
2. **Create if missing** — if no active session (or session is cancelled/completed), create a new one with status `"discovery"`
3. **Update lastSeenAt** on the user
4. **Check reset commands** — `"hi"`, `"hello"`, `"menu"`, `"restart"`, `"start"` always cancel the current session and start a fresh discovery
5. **Route by status**

```ts
switch (session.status) {
  case "discovery":        → discovery()
  case "form_sent":        → handleFormReply()
  case "refining":         → flowEngine()
  case "confirming":       → handleConfirmation()
  case "generating":       → "Still generating, hang tight!"
  case "awaiting_payment": → "Please use the payment link above."
  case "completed":        → "Type 'hi' to create another one."
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
- `"restart"` → cancels session, creates new one, calls `discovery()` on it

---

## Phase 5 — Fulfillment

**File:** `services/conversation/fulfillment.ts`

See [media-generation.md](./media-generation.md) for how outputs are generated and [payment.md](./payment.md) for the payment flow.

After all outputs are sent and the payment link is delivered:
- `status` → `"awaiting_payment"`
- `collectedData.paymentLinkId` → Razorpay payment link ID (for webhook lookup)

---

## Reset Flow

Reset commands (`hi`, `hello`, `menu`, `restart`, `start`) at any status:
1. Set current session's `status: "cancelled"`
2. Create a new `conversations` document with `status: "discovery"`
3. Update `users/{phone}.activeSessionId` → new session ID
4. Call `discovery()` on the new session (sends welcome message)

"Start Over" button in confirmation does the same thing.
