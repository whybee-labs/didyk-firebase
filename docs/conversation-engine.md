# Conversation Engine

The conversation engine is the core of the backend. Every incoming WhatsApp message is routed through `handleIncomingMessage.ts`.

---

## State Machine

```
                ┌──────────────┐
  new user      │    intake    │  ← welcome: Image / Video / Audio buttons
                └──────┬───────┘
                       │ output type chosen → discovery message + describe prompt
                       │ user sends description → classify intent → collect structured params
                       │ ref images? → uploading | no → briefing
                ┌──────▼───────┐
                │   uploading  │  ← user sends reference images → stored in Firebase Storage
                └──────┬───────┘
                       │ user taps "Done" → briefing
                ┌──────▼───────┐
                │   briefing   │  ← LLM question loop: list / boolean / text questions
                └──────┬───────┘
                       │ ready:true → send enrichedPrompt → user confirms or pushes back
                       │ image/audio: → generating
                       │ video: → planning
                ┌──────▼───────┐
                │   planning   │  ← (video only) LLM generates scene plan, user reviews
                └──────┬───────┘
                       │ approved → confirming
                ┌──────▼───────┐
                │  confirming  │  ← (video only) full summary, user taps Confirm
                └──────┬───────┘
                       │ confirmed → generating
                ┌──────▼───────┐
                │  generating  │  ← generate once → upload clean + watermarked preview
                └──────┬───────┘
                       │ preview sent (if cap allows) + payment CTA sent
                ┌──────▼──────────┐
                │ awaiting_payment │  ← waiting for Razorpay webhook
                └──────┬──────────┘  ← "Refine brief" button → back to briefing (capped)
                       │ payment_link.paid webhook
                ┌──────▼───────┐
                │  delivering  │  ← send stored cleanUrl directly (no re-generation)
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

6. **Route by status**:

```ts
switch (conversation.status) {
  case "intake":           → handleIntake()
  case "uploading":        → handleUploading()
  case "briefing":         → handleBriefing()
  case "planning":         → handlePlanning()
  case "confirming":       → handleConfirmation()
  case "generating":       → "Still working on it, hang tight!"
  case "awaiting_payment": → "refine_brief" button → back to briefing (if refinements remain); else → "Complete your payment using the link above."
  case "feedback":         → handleFeedback()
  default:                 → handleIntake()   // completed or unknown → restart
}
```

---

## Phase 1 — Intake

**File:** `services/conversation/intake.ts`

Triggered when `status === "intake"`. Collects the output type and structured parameters.

**First message (no outputType yet):**
- Sends welcome with 3 buttons: 🎨 Image / 🎬 Video / 🎵 Audio
- `button_reply` → stores `structuredData.outputType`, sends dynamic discovery message (built from intents), asks for description

**After outputType set, awaiting description (text message):**
- Calls LLM to classify intent → stores `intentId` + `unstructuredData._initialDescription`
- Calls `promptNextParam()` to collect structured params (platform, style, genre, mood) as button sequences
- Once all params collected → checks `intent.supportsReferenceImages`
  - Yes → sends reference images prompt, sets `status: "uploading"`
  - No → sets `status: "briefing"`, calls `handleBriefing()`

**Structured params collected in order:**
- Image: platform → style
- Video: platform → style → duration
- Audio: genre → mood

---

## Phase 2 — Uploading

**File:** `services/conversation/uploading.ts`

Triggered when `status === "uploading"`. Collects reference images.

- Image messages: download from Meta, upload to Firebase Storage → append URL to `structuredData.referenceImageUrls`
- "Done" button or `button_reply` with `id === "no_images"` → set `status: "briefing"`, call `handleBriefing()`
- Text messages → nudge to send images or tap Done

---

## Phase 3 — Briefing

**File:** `services/conversation/briefing.ts`

Triggered when `status === "briefing"`. LLM-driven question loop.

**On entry (no `pendingQuestion`):**
- Calls LLM with `structuredData` + `unstructuredData` + intent config
- LLM returns `{ ready: false, question: { key, type, text, options? } }` or `{ ready: true, enrichedPrompt }`

**If `ready: false`:**
- Render question as WhatsApp component (list → sendList, boolean → sendButtons, text → sendText)
- Store `pendingQuestion: { key, type }` on conversation doc

**On user reply (pendingQuestion exists):**
- Map reply to `unstructuredData[pendingQuestion.key]`, clear `pendingQuestion`
- Call LLM again

**If `ready: true`:**
- Send `enrichedPrompt` to user + "Does this look right?" (Yes / Add more detail buttons)
- Yes → `transitionFromBriefing()`: image/audio → `generating` + `startFulfillment()`; video → `planning` + `handlePlanning()`
- No / text → feed reply back into briefing loop, continue

---

## Phase 4 — Planning (Video Only)

**File:** `services/conversation/planning.ts`

Triggered when `status === "planning"`. LLM generates a scene plan.

- On entry: LLM produces scene descriptions, music direction, colour palette
- Sent to user as a text summary + Approve / Revise buttons
- Approve → set `status: "confirming"`, call `sendConfirmation()`
- Revise or text → feed feedback back into planning loop

---

## Phase 5 — Confirming (Video Only)

**File:** `services/conversation/confirmation.ts`

Triggered when `status === "confirming"`. Final review before generation.

- Shows full brief summary + Confirm / Edit buttons
- Confirm → set `status: "generating"`, call `startFulfillment()`
- Edit → set `status: "briefing"`, call `handleBriefing()` to re-enter the loop

---

## Phase 6 — Fulfillment

**File:** `services/conversation/fulfillment.ts`

Called by briefing (image/audio) or confirmation (video).

1. Set `status: "generating"`
2. Call generator — **generates once only**:
   - Image: `generateImage()` → `Buffer` → upload clean → `cleanUrl`; apply watermark/low-res → upload → `previewUrl`
   - Video/Audio: `generateVideo/generateAudio()` → URL stored as both `cleanUrl` and `previewUrl` (watermarking not yet implemented)
3. Persist `cleanUrl` + `previewUrl` on conversation doc
4. Create Razorpay payment link → set `status: "awaiting_payment"` + store `paymentData`
5. Check `previewGate.checkPreviewAllowed(phone)`:
   - **Allowed**: send `previewLabel` + watermarked preview + payment CTA + "Refine brief" button (if refinements remain)
   - **Cap hit**: send `capHitMessage` + payment CTA only (no preview shown)
6. Increment `previewCount` on user doc (only when preview is shown)

On error → send error message, set `status: "briefing"`.

**Prices (INR):** image ₹99 · audio ₹149 · video ₹299

**Preview policy** is controlled entirely by `config/previewPolicy.ts` — change values and redeploy, no logic changes needed.

---

## Phase 7 — Payment & Delivery

Payment is handled by the Razorpay webhook (`api/razorpayWebhook.ts`).

On `payment_link.paid`:
1. Look up conversation by `paymentData.linkId`
2. Store `paymentData.paidAt`
3. Read `cleanUrl` from conversation doc — send directly via `dispatchOutput` (**no re-generation**)
4. Send feedback prompt

---

## Phase 8 — Feedback

**File:** `services/conversation/feedback.ts`

Triggered when `status === "feedback"`. Collects a star rating.

- On entry: sends rating buttons (⭐ to ⭐⭐⭐⭐⭐)
- `button_reply` → store `feedbackData.rating`, set `status: "completed"`
- If rating is positive → send contact / share prompt
