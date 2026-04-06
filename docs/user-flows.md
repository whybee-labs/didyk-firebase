# User Flows

Concrete end-to-end conversation traces showing what the user sees and what happens in the backend for each major path. Traced against the live code.

---

## Flow 1 — Quick image, Creative Director produces draft immediately

**Scenario:** User wants a minimalist LinkedIn post for their design agency. Enough context for the Creative Director to produce a draft on the first message.

| User / Bot | Behind the screen |
|---|---|
| **User:** "hi" | `handleIncomingMessage`: isReset → status = `intake`, structuredData / intentId / messageHistory cleared |
| **Bot:** "What would you like to create?" + [Image / Video / Audio] | `handleIntake` → no outputType → `sendWelcome` |
| **User:** taps Image | `structuredData.outputType = "image"` → sends `intake.describePrompt` |
| **Bot:** "Tell me what you want to create" | |
| **User:** "a minimalist LinkedIn post celebrating 5 years of my design agency, dark theme with gold accents" | `setProcessing(true)` → `callCreativeDirector()` → CD has enough context → `ready: true` |
| *(behind the scenes)* | status = `drafting`, persists `_title`, `_enrichedPrompt`, `_style`, `_mood`, `_aspectRatio` in unstructuredData + `aspectRatio` in structuredData |
| **Bot:** "✨ *5 Years of Design Excellence*\n\n[vivid enriched prompt]\n\n📐 16:9 • 🎨 Minimal • Bold\n\nTap Create now to generate, or just tell me what to change." + [Create now / Add photos] | `sendDraftSummary` with buttons |
| **User:** taps Create now | `createOrderAndRequestPayment` → Razorpay link created → status = `awaiting_payment` |
| **Bot:** "Tap below to pay..." + [Pay ₹99] | `sendCTAButton` |
| **User:** taps Pay ₹99 → pays in Razorpay | |
| *(webhook fires)* | `razorpayWebhook`: `paidAt` stored → `sendText("working on it")` → `generateAndDeliver()` → `generateImage` → upload → `dispatchOutput` |
| **Bot:** "Your content is on its way!" + final image | status = `delivering` |
| **Bot:** "How was it?" + [Excellent / Good / Needs work] | `sendFeedbackRequest` → status = `feedback` |
| **User:** taps Excellent | `handleFeedback` → positive → share message + contact card → status = `completed` |

---

## Flow 2 — Creative Director asks questions first

**Scenario:** User gives a vague description. The Creative Director asks clarifying questions before producing a draft.

| User / Bot | Behind the screen |
|---|---|
| **User:** picks Image, types "make me a poster" | `callCreativeDirector()` → CD needs more info → `ready: false` |
| *(behind the scenes)* | status = `drafting`, `pendingQuestion` stored |
| **Bot:** "What's the poster for?" + [Birthday / Product launch / Something else] | CD chose `type: "buttons"` → `sendButtons` |
| **User:** taps Birthday | `handleDrafting` → `extractUserText` returns "Birthday" → clears `pendingQuestion` → `callCreativeDirector()` |
| **Bot:** "Any specific text or names that should appear on it?" | CD chose `type: "text"` → `sendText` |
| **User:** "Happy Birthday Priya, turning 30!" | `callCreativeDirector()` → CD now has enough → `ready: true` |
| **Bot:** "✨ *Priya's 30th Birthday Bash*\n\n[enriched prompt]\n\n📐 9:16 • 🎨 Illustrated • Joyful" + [Create now / Add photos] | draft summary |
| **User:** "make it more elegant, less cartoonish" | `callCreativeDirector()` with `previousDraft` context → CD revises → `ready: true` |
| **Bot:** "✨ *Priya's Elegant 30th*\n\n[revised enriched prompt]\n\n📐 9:16 • 🎨 Minimal • Elegant" + [Create now / Add photos] | revised draft summary, still in `drafting` |
| **User:** taps Create now | → payment flow (same as Flow 1) |

---

## Flow 3 — Image with reference photos

**Scenario:** User wants a product poster and shares a product photo.

| User / Bot | Behind the screen |
|---|---|
| **User:** picks Image, sends photo with caption "festive sale poster for my chai shop" | Image uploaded to Storage → `referenceImageUrls` updated → `callCreativeDirector()` with `referenceImageCount: 1` |
| *(behind the scenes)* | status = `drafting`, CD has reference image context |
| **Bot:** "✨ *Festive Chai Sale*\n\n[enriched prompt mentioning the product photo]\n\n📐 1:1 • 🎨 Photorealistic • Warm\n📎 1 reference image(s)" + [Create now / Add photos] | |
| **User:** taps Add photos | status = `uploading` → "Send your images now" |
| **User:** sends another photo | `handleUploading` → download + upload → `referenceImageUrls` now has 2 entries |
| **Bot:** "Got it! (2/5)" + [Done / Send more] | |
| **User:** taps Done | status = `drafting` → re-runs Creative Director with updated reference count |
| **Bot:** updated draft summary with "📎 2 reference image(s)" | |
| **User:** taps Create now | → payment flow |

---

## Flow 4 — Image sent directly in drafting

**Scenario:** User is in the drafting conversation and sends a photo without going through the "Add photos" button.

| User / Bot | Behind the screen |
|---|---|
| *(user is in `drafting`, has a draft summary showing)* | |
| **User:** sends a product photo | `handleDrafting` → `message.type === "image"` → download + upload → append to `referenceImageUrls` → re-run Creative Director |
| **Bot:** "📎 Photo added!" then updated draft summary | `prefixMessage` shown, then `sendDraftSummary` |

---

## Flow 5 — Rap song (audio)

**Scenario:** User wants a hype rap about their cricket startup.

| User / Bot | Behind the screen |
|---|---|
| **User:** picks Audio, types "rap about my cricket startup CricketChamp, energetic and hype" | `callCreativeDirector()` → CD may ask or produce draft directly |
| **Bot:** (if ready) "✨ *CricketChamp Anthem*\n\n[enriched prompt]..." + [Create now / Add photos] | |
| **User:** taps Create now | `createOrderAndRequestPayment` → [Pay ₹149] |
| *(payment + generation + delivery same as image flow)* | |

---

## Flow 6 — User edits the draft

**Scenario:** User isn't happy with the Creative Director's draft and requests changes.

| User / Bot | Behind the screen |
|---|---|
| *(drafting, draft summary shown)* | |
| **Bot:** "✨ *Summer Vibes Poster*\n\n[bright colorful prompt]..." + [Create now / Add photos] | |
| **User:** "make it darker, more moody, and add neon accents" | `handleDrafting` → `callCreativeDirector()` with `previousDraft` in system prompt → CD applies only requested changes |
| **Bot:** "✨ *Neon Night Vibes*\n\n[revised dark moody prompt with neon]..." + [Create now / Add photos] | stays in `drafting`, revised draft persisted |
| **User:** taps Create now | → payment flow |

> The Creative Director's edit prompt instructs it to "apply ONLY what they asked for. Preserve everything they didn't mention."

---

## Flow 7 — Refine brief from awaiting_payment

**Scenario:** User paid attention to the draft summary while in `awaiting_payment` and wants to change something before paying.

| User / Bot | Behind the screen |
|---|---|
| *(user is in `awaiting_payment`, payment CTA sent)* | |
| **User:** taps "Refine brief" button | `refinementCount` checked against `PREVIEW_POLICY.maxRefinementsPerConversation` |
| *(if under cap)* | status = `drafting`, `refinementCount` incremented → `handleDrafting` called |
| **Bot:** re-enters drafting conversation | user can edit the draft, then tap "Create now" again for a new payment link |
| *(if cap hit)* | |
| **Bot:** "You've used all your refinements for this order." | no state change |

---

## Flow 8 — Edge cases

### 8a — Message while awaiting payment

| User / Bot | Behind the screen |
|---|---|
| *(user is in `awaiting_payment`, payment link sent)* | |
| **User:** "is this secure?" | `case "awaiting_payment"` → `sendText(t("status.awaitingPayment"))` |
| **Bot:** "Please complete your payment using the link sent above." | No state change |

> **Gap:** There is no way out of `awaiting_payment` except completing payment, tapping "Refine brief", or waiting for the idle timeout (8h) to reset the conversation.

### 8b — Message while generating (post-payment)

| User / Bot | Behind the screen |
|---|---|
| *(user paid, generation in progress, `processing: true`)* | |
| **User:** sends any message | `processing` check fires before routing → early return |
| **Bot:** "Hold on, I'm working on it..." | `t("status.processing")` |

### 8c — Idle for 8+ hours, user returns

| User / Bot | Behind the screen |
|---|---|
| *(user was mid-drafting, abandoned for 8+ hours)* | |
| **User:** sends any message | `getOrCreateConversation`: `hoursSince >= 8` → new conversation doc created |
| **Bot:** Welcome buttons | Fresh `intake` state |

### 8d — User sends "hi" to reset mid-flow

| User / Bot | Behind the screen |
|---|---|
| *(user is in `drafting` or any state)* | |
| **User:** "hi" | `isReset = true` → Firestore clears intentId, structuredData, unstructuredData, pendingQuestion, messageHistory → status = `intake` |
| **Bot:** Welcome buttons + [Image / Video / Audio] | Completely fresh start on same conversation doc |

### 8e — Voice note sent at any point

| User / Bot | Behind the screen |
|---|---|
| **User:** sends voice note | `message.type === "audio"` → early return before routing |
| **Bot:** "Sorry, I can't process voice notes." | `t("errors.voiceNoteNotAccepted")` — no state change |

### 8f — Generation fails after payment

| User / Bot | Behind the screen |
|---|---|
| *(payment confirmed, `generateAndDeliver` running)* | |
| *(generator throws error)* | `catch` block → send error message → status = `drafting`, `processing: false` |
| **Bot:** "Something went wrong generating your content." | User can retry from drafting or contact support |

---

## State machine summary

```
intake
  ↓ (outputType picked + description sent → Creative Director call)
drafting ←──────────────────────────────────────────────┐
  ↓ (Create now)                                         │ (Add photos → uploading → Done)
awaiting_payment ←── "Refine brief" → drafting (capped) ┘
  ↓ (payment_link.paid webhook)
generating → delivering → feedback → completed

Legacy (backward compat):
  briefing → planning (video) → confirming (video) → generating → ...

Any state + "hi" / "reset" → intake
processing: true + any message → "please wait" (no routing)
awaiting_payment + any non-refine message → nudge to pay
```
