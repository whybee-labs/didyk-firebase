# Conversation Engine

The conversation engine is the core of the backend. Every incoming WhatsApp message is routed through `handleIncomingMessage.ts`.

---

## State Machine

```
                ┌──────────────┐
  new user      │    intake    │  ← welcome: Image / Video / Audio buttons
                └──────┬───────┘
                       │ output type chosen → "describe what you want"
                       │ user sends description → Creative Director LLM call
                       │ CD ready? → drafting (with summary)
                       │ CD needs info? → drafting (with question)
                ┌──────▼───────┐
                │   drafting   │  ← Creative Director conversation loop
                └──────┬───────┘  ← user can send text, tap buttons/list, or send images
                       │ "Add photos" → uploading (sub-flow, returns to drafting)
                       │ CD asks question → renders as buttons/list/text
                       │ CD ready → shows draft summary + "Create now" / "Add photos"
                       │ user requests changes → CD revises draft, stays in drafting
                       │ "Create now" → createOrderAndRequestPayment
                ┌──────▼──────────┐
                │ awaiting_payment │  ← payment CTA sent; waiting for Razorpay webhook
                └──────┬──────────┘  ← "Refine brief" button → back to drafting (capped)
                       │ payment_link.paid webhook
                ┌──────▼───────┐
                │  generating  │  ← generateAndDeliver: generate + upload + send
                └──────┬───────┘
                       │
                ┌──────▼───────┐
                │  delivering  │  ← final output sent to user
                └──────┬───────┘
                       │
                ┌──────▼───────┐
                │   feedback   │  ← star rating prompt
                └──────┬───────┘
                       │
                ┌──────▼───────┐
                │  completed   │
                └──────────────┘
```

### Pay-first flow

No image generation happens before payment. The draft summary (title + enriched prompt + style/mood/aspect ratio) is the preview. The user approves the draft, pays, and only then does generation begin. This eliminates wasted GPU costs on unpaid previews.

```
drafting (draft summary) → awaiting_payment → generating → delivering
```

### Processing lock

A `processing` boolean field on the conversation document prevents double-handling during async operations (LLM calls, image uploads, generation). When `processing` is true, incoming messages receive a "please wait" response and are not routed to any handler.

### Legacy states (backward compatibility)

`briefing`, `planning`, and `confirming` still exist in the `ConversationStatus` type and are handled by the message router. Existing conversations that were created before the Creative Director overhaul continue to use these states. New conversations use the `drafting` state instead.

"hi" / "reset" / "start over" → resets conversation to `intake` from any state.
New conversation created when: status is `completed`, idle > 8 hours, or no active conversation.

---

## Message Routing

`handleIncomingMessage.ts` is the entry point for every message.

1. **Load or create conversation** — `getOrCreateConversation(phone)`:
   - Look up `users/{phone}` → get `activeConversationId`
   - Load `conversations/{id}` — resume if status ≠ `completed` and not idle >8h
   - Otherwise create a new conversation doc + update user's `activeConversationId`

2. **Voice notes** — rejected immediately with an error message (not supported)

3. **Reset shortcut** — if text is `"hi"`, `"reset"`, `"start over"`, or `"restart"`:
   - Update doc: `status: "intake"`, clear `intentId`, `structuredData`, `unstructuredData`, `pendingQuestion`, `messageHistory`

4. **Update timestamps** — `lastSeenAt` on user + `lastMessageAt` on conversation (parallel)

5. **Log message** — append to `conversations/{id}/messages/` subcollection (fire-and-forget)

6. **Append to `messageHistory`** — incoming user text added to rolling window (last 10 entries) for LLM context (skipped on reset)

7. **Processing lock check** — if `conversation.processing` is true, send "please wait" message and return (no routing)

8. **Route by status**:

```ts
switch (conversation.status) {
  case "intake":           → handleIntake()
  case "uploading":        → handleUploading()
  case "drafting":         → handleDrafting()
  case "briefing":         → handleBriefing()       // legacy
  case "planning":         → handlePlanning()        // legacy (video)
  case "confirming":       → handleConfirmation()    // legacy (video)
  case "generating":       → "Still working on it, hang tight!"
  case "awaiting_payment": → "refine_brief" button → back to drafting (if refinements remain); else → "Complete your payment using the link above."
  case "feedback":         → handleFeedback()
  default:                 → handleIntake()   // completed or unknown → restart
}
```

---

## Phase 1 — Intake

**File:** `services/conversation/intake.ts`

Triggered when `status === "intake"`. Collects the output type and immediately invokes the Creative Director.

**First message (no outputType yet):**
- Sends welcome with 3 buttons: Image / Video / Audio
- `button_reply` → stores `structuredData.outputType`, sends "describe what you want" prompt

**After outputType set — user sends description (text or image+caption):**
- Calls Creative Director LLM with the user's message, conversation history, and reference image count
- Sets `processing: true` during the async LLM call
- Transitions to `status: "drafting"`
- If Creative Director returns `ready: true` → persists draft (title, enrichedPrompt, style, mood, aspectRatio) and sends draft summary with "Create now" / "Add photos" buttons
- If Creative Director returns `ready: false` → stores `pendingQuestion` and renders the question as buttons/list/text

**Image without caption:** stored as reference image, user prompted to describe what they want.

**No more intent classification or structured param collection** — the Creative Director infers style, mood, aspect ratio, and everything else from the conversation. `structuredData` now only holds `outputType`, `aspectRatio` (set by Creative Director), and `referenceImageUrls`.

---

## Phase 2 — Uploading (sub-flow from drafting)

**File:** `services/conversation/uploading.ts`

Triggered when `status === "uploading"`. Collects reference images. This is a sub-flow — the user enters uploading from `drafting` (via "Add photos" button) and returns to `drafting` when done.

- Image messages: download from Meta, upload to Firebase Storage → append URL to `structuredData.referenceImageUrls`
- "Done" button or `button_reply` with `id === "upload_done"` → set `status: "drafting"`, re-run Creative Director
- Text messages → nudge to send images or tap Done

---

## Phase 3 — Drafting (Creative Director)

**File:** `services/conversation/drafting.ts`

Triggered when `status === "drafting"`. This is the main creative conversation loop, powered by the Creative Director LLM.

**Handles:**
- **"Create now" button** → calls `createOrderAndRequestPayment()` (pay-first, no generation)
- **"Add photos" button** → transitions to `uploading` sub-flow
- **Image sent directly** → auto-attaches as reference image, re-runs Creative Director with updated context
- **Text / button reply / list reply** → extracts user text, clears `pendingQuestion` if one was pending, re-runs Creative Director

**Creative Director result handling:**
- `ready: true` → persists draft fields (`_title`, `_enrichedPrompt`, `_style`, `_mood`, `_aspectRatio` in `unstructuredData`; `aspectRatio` in `structuredData`) → sends draft summary with "Create now" / "Add photos" buttons
- `ready: false` → stores `pendingQuestion`, renders question as buttons (max 3) / list (4+ options) / text input

**Draft summary format:**
```
✨ *Short Catchy Title*

Vivid detailed creative brief...

📐 1:1 • 🎨 Cinematic • Bold
📎 2 reference image(s)

Tap Create now to generate, or just tell me what to change.
[Create now] [Add photos]
```

**Editing the draft:** User can send free text at any time to request changes. The Creative Director receives the `previousDraft` context and applies only the requested modifications. No state change — stays in `drafting`.

**Fallback:** If an unrecognized message type arrives, re-shows the current draft summary or the "describe what you want" prompt.

---

## Phases 4-5 — Planning & Confirming (Legacy, Video Only)

**Files:** `services/conversation/planning.ts`, `services/conversation/confirmation.ts`

These states still exist for backward compatibility with conversations created before the Creative Director overhaul. New conversations go through `drafting` instead.

- **Planning:** LLM generates scene plan, user approves or revises
- **Confirming:** Final brief review before generation

---

## Phase 6 — Fulfillment (Pay-First)

**File:** `services/conversation/fulfillment.ts`

Fulfillment is now split into two separate functions:

### `createOrderAndRequestPayment(phone, conversation)`

Called from `drafting` when user taps "Create now". **No generation happens here.**

1. Create Razorpay payment link
2. Set `status: "awaiting_payment"` + store `paymentData` (linkId, amount, currency, createdAt)
3. Send payment CTA button via `sendCTAButton`

### `generateAndDeliver(phone, conversation)`

Called from the Razorpay webhook (`api/razorpayWebhook.ts`) after payment is confirmed.

1. Set `status: "generating"` + `processing: true`
2. Call generator:
   - Image: `generateImage()` → `Buffer` → upload → `cleanUrl`
   - Video: `generateVideo()` → URL → `cleanUrl`
   - Audio: `generateAudio()` → URL → `cleanUrl`
3. Set `status: "delivering"` + persist `cleanUrl`
4. Send final output via `dispatchOutput` (sendImage/sendVideo/sendAudio)
5. Set `processing: false`

On error → send error message, set `status: "drafting"` (user can retry after fixing).

**Prices (INR):** image ₹99 · audio ₹149 · video ₹299

---

## Phase 7 — Payment & Delivery

Payment is handled by the Razorpay webhook (`api/razorpayWebhook.ts`).

On `payment_link.paid`:
1. Look up conversation by `paymentData.linkId`
2. Guard against duplicate processing (skip if `paidAt` already set)
3. Store `paymentData.paidAt`
4. Send "working on it" message
5. Call `generateAndDeliver(phone, conversation)` — this is where generation actually happens (pay-first model)
6. After delivery, wait 4s then send feedback prompt

---

## Phase 8 — Feedback

**File:** `services/conversation/feedback.ts`

Triggered when `status === "feedback"`. Collects a star rating.

- On entry: sends rating buttons (⭐ to ⭐⭐⭐⭐⭐)
- `button_reply` → store `feedbackData.rating`, set `status: "completed"`
- If rating is positive → send contact / share prompt
