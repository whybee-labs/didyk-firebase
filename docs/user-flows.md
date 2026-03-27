# User Flows

Concrete end-to-end conversation traces showing what the user sees and what happens in the backend for each major path. Traced against the live code.

---

## Flow 1 — Quick image, no reference images

**Scenario:** User wants a minimal LinkedIn post for their design agency.

| User / Bot | Behind the screen |
|---|---|
| **User:** "hi" | `handleIncomingMessage`: isReset → status = `intake`, structuredData / intentId / messageHistory cleared |
| **Bot:** "What would you like to create?" + [🎨 Image / 🎬 Video / 🎵 Audio] | `handleIntake` → no outputType → `sendWelcome` |
| **User:** taps 🎨 Image | `structuredData.outputType = "image"` → sends discovery text listing image intents → sends `intake.describePrompt` |
| **Bot:** "🎨 I can create promo posters & banners, and social media posts — just tell me what you have in mind!" | dynamic from `buildDiscoveryMessage("image")` |
| **Bot:** "Tell me what you want to create 👇" | |
| **User:** "a minimalist LinkedIn post for my design agency" | LLM classifies → `social_post`. Text saved to `unstructuredData._initialDescription` + `messageHistory[0]`. Falls through to `promptNextParam` → no platform → platform list |
| **Bot:** Platform list picker | `sendList` |
| **User:** picks 🌐 General / Other | `structuredData.platform = "general"`, `structuredData.aspectRatio = "1:1"` → `promptNextParam` → no style → style list |
| **Bot:** Style list picker | |
| **User:** picks ⬜ Minimal | `structuredData.style = "minimal"` → `promptNextParam` → all image params done → checks `social_post.supportsReferenceImages = true` → sends `referenceImagesHint` |
| **Bot:** "Got a photo to use in the post? Share it now." + [📎 Yes / ❌ No] | custom hint from intent |
| **User:** taps ❌ No | `selectedId = "no_images"` → `transitionToBriefing` → status = `briefing` → `handleBriefing` with empty message |
| **Bot:** "What's the main message for this post?" | LLM sees structuredData + `_initialDescription` → `ready: false`, question `type: "text"` → `pendingQuestion` stored |
| **User:** "Celebrating 5 years, open for new clients" | Stored in `unstructuredData.mainMessage`, history updated → LLM called again |
| **Bot:** "What tone?" + [Professional / Inspirational / Bold / Fun] | LLM returns list question → `sendList` |
| **User:** picks Professional | Stored in `unstructuredData.tone` → LLM called → `ready: true` → enrichedPrompt stored in `unstructuredData._enrichedPrompt` |
| **Bot:** "Here's what I'll create: [enriched brief]" + [✅ Looks good! / ✏️ Add more detail] | `briefing.readyPrompt` with enrichedPrompt |
| **User:** taps ✅ Looks good! | `brief_approved` → `transitionFromBriefing`: outputType = image → `startFulfillment` directly (no confirming step) |
| **Bot:** "👇 Here's your preview:" + image | status = `generating` → `generateImage` → `sendImage` |
| **Bot:** "🎉 Happy with it? Tap below to pay..." + [✨ Pay ₹99] | Razorpay link created → `sendCTAButton` → status = `awaiting_payment` |
| **User:** taps ✨ Pay ₹99 → pays in Razorpay | |
| *(webhook fires)* | `razorpayWebhook`: finds conversation by `paymentData.linkId` → `generateImage` again → `dispatchOutput` → `paidAt` stored → 4s delay |
| **Bot:** "🎉 Your file is on its way!" + final image | |
| **Bot:** "How was it?" + [✅ Excellent / 👍 Good / 🤔 Needs work] | `sendFeedbackRequest` → status = `feedback` |
| **User:** taps ✅ Excellent | `handleFeedback` → positive → sends share message + Whybee contact card → status = `completed` |

---

## Flow 2 — Product poster with reference image

**Scenario:** User wants a festive sale poster for their chai shop and has a product photo.

| User / Bot | Behind the screen |
|---|---|
| **User:** picks 🎨 Image, types "festive sale poster for my chai shop" | Intent → `product_poster`. `supportsReferenceImages = true` |
| Platform → 📸 Instagram Post, Style → 📷 Photorealistic | `structuredData: { platform: "instagram_post", aspectRatio: "1:1", style: "photorealistic" }` |
| **Bot:** "Share a photo of your product or brand — I'll use it as the base for the poster." + [📎 Yes / ❌ No] | `promptNextParam` uses `product_poster.referenceImagesHint` |
| **User:** taps 📎 Yes | `selectedId = "has_images"` → status = `uploading` → sends `intake.sendImagesNow` |
| **User:** sends photo | `handleUploading` → `downloadWhatsAppMedia` → `uploadFile` to Firebase Storage → URL pushed to `structuredData.referenceImageUrls` |
| **Bot:** "Got it! (1/5)" + [✅ Done / 📷 Send more] | remaining = 4 |
| **User:** taps ✅ Done | `button_reply "upload_done"` → `proceedToBriefing` → status = `briefing` → `handleBriefing` |
| Briefing loop — LLM sees reference image URL in structuredData | Asks about offer text, mood, colours → `unstructuredData` built up |
| ... → ✅ Looks good! → preview + ✨ Pay ₹99 | Same as Flow 1 from fulfillment onwards |

---

## Flow 3 — Rap song (audio — reference images skipped entirely)

**Scenario:** User wants a hype rap about their cricket startup.

| User / Bot | Behind the screen |
|---|---|
| **User:** picks 🎵 Audio, types "rap about my cricket startup CricketChamp" | Intent → `rap_from_text`. `supportsReferenceImages = false` |
| **Bot:** Genre list | `promptNextParam` for audio → no genre → list |
| **User:** picks 🎤 Rap / Hip-hop | `structuredData.genre = "rap"` |
| **Bot:** Mood list | |
| **User:** picks ⚡ Energetic | `structuredData.mood = "energetic"` → `promptNextParam` → intent has `supportsReferenceImages = false` → **reference images question skipped entirely** → `transitionToBriefing` |
| Briefing — LLM uses `rap_from_text.briefingInstructions` and `requiredFields: ["sourceText", "rapStyle", "theme"]` | Asks about source text, vibe, punchlines |
| **User:** answers questions | Stored in `unstructuredData` |
| ... → ✅ Looks good! | `startFulfillment` → `generateAudio` → sends audio preview |
| **Bot:** payment + [✨ Pay ₹149] | `PRICES["audio"] = 149` |

---

## Flow 4 — Promo video (full path: briefing → planning → confirming)

**Scenario:** User wants a 15-second Instagram Reel promo for their restaurant.

| User / Bot | Behind the screen |
|---|---|
| **User:** picks 🎬 Video, types "promo video for my restaurant Spice Garden" | Intent → `product_promo_video`. `supportsReferenceImages = true` |
| Platform → 📱 Instagram Reel, Style → 🎬 Cinematic, Duration → 15 seconds | `structuredData: { platform: "instagram_reel", aspectRatio: "9:16", style: "cinematic", duration: 15 }` |
| **Bot:** "Got any product photos or brand assets? Share them and I'll include them in the video." + [📎 Yes / ❌ No] | `product_promo_video.referenceImagesHint` |
| **User:** shares 2 food photos | Both uploaded, `referenceImageUrls` has 2 entries |
| **User:** taps ✅ Done → briefing | LLM asks about tone, key message, target audience |
| ... → ✅ Looks good! | `transitionFromBriefing`: outputType = "video" → nextStatus = `planning` (not `generating`) |
| **Bot:** "🎬 Here's my plan: Scene 1 (5s): … Scene 2 (5s): … 🎵 Music: Upbeat Indian fusion 🎨 Colour: Warm reds. Does this look right?" + [✅ Approve / ✏️ Revise] | `handlePlanning` → LLM generates `Videoplan`, stored in `unstructuredData._scenePlan / _musicDirection / _colourPalette` |
| **User:** taps ✅ Approve | `plan_approved` → status = `confirming` → `sendConfirmation` |
| **Bot:** Structured summary (type / platform / style / duration / brief) + [✨ Create / ✏️ Edit] | **Video-only step** — image and audio skip this entirely |
| **User:** taps ✨ Create | `handleConfirmation` → `startFulfillment` → `generateVideo` → preview → payment link |
| **Bot:** preview + [✨ Pay ₹299] | `PRICES["video"] = 299` |
| **User:** taps ✏️ Edit instead | status = `briefing` → `sendText(t("confirm.editPrompt"))` → user can add more detail |

---

## Flow 5 — User pushes back on the brief

**Scenario:** User isn't happy with the enriched prompt and wants to refine it.

| User / Bot | Behind the screen |
|---|---|
| *(briefing loop reaches ready: true)* | LLM returns enrichedPrompt |
| **Bot:** "Here's what I'll create: [brief — missing dark theme]" + [✅ Looks good! / ✏️ Add more detail] | |
| **User:** taps ✏️ Add more detail | `brief_more` → `sendText(t("briefing.addMoreDetail"))` → **no state change**, stays in `briefing` |
| **Bot:** "What would you like to add?" | |
| **User:** "also make it dark themed with gold accents" | No pendingQuestion, message is text → appended to `messageHistory` → LLM called with updated history |
| **Bot:** Updated "Here's what I'll create: [dark theme + gold accents brief]" + [✅ Looks good! / ✏️ Add more detail] | LLM should return `ready: true` with revised prompt |
| **User:** taps ✅ Looks good! | Proceeds to generation |

> **Note:** If the LLM decides to ask a clarifying question instead of immediately returning the revised enrichedPrompt, the user gets a question rather than the updated brief. The LLM instructions encourage returning `ready: true` when enough context exists, but there is no hard constraint forcing it.

---

## Flow 6 — Edge cases

### 6a — Message while awaiting payment

| User / Bot | Behind the screen |
|---|---|
| *(user is in `awaiting_payment`, payment link sent)* | |
| **User:** "is this secure?" | `handleIncomingMessage` → `case "awaiting_payment"` → `sendText(t("status.awaitingPayment"))` |
| **Bot:** "✨ Please complete your payment using the link sent above." | No state change |
| **User:** "cancel this" | Same response — **no cancellation path exists** |

> **Gap:** There is no way out of `awaiting_payment` except completing payment or waiting for the idle timeout (8h) to reset the conversation.

### 6b — Idle for 8+ hours, user returns

| User / Bot | Behind the screen |
|---|---|
| *(user was mid-briefing, abandoned for 8+ hours)* | |
| **User:** sends any message | `getOrCreateConversation`: `hoursSince >= 8` → **new conversation doc created**, old one abandoned in Firestore |
| **Bot:** Welcome buttons | Fresh `intake` state |

### 6c — User sends "hi" to reset mid-flow

| User / Bot | Behind the screen |
|---|---|
| *(user is in `briefing` or any state)* | |
| **User:** "hi" | `isReset = true` → Firestore update clears `intentId`, `structuredData`, `unstructuredData`, `pendingQuestion`, `messageHistory` → status = `intake` |
| **Bot:** Welcome buttons + [🎨 Image / 🎬 Video / 🎵 Audio] | Completely fresh start on same conversation doc |

### 6d — Voice note sent at any point

| User / Bot | Behind the screen |
|---|---|
| **User:** sends voice note | `handleIncomingMessage`: `message.type === "audio"` → early return before routing |
| **Bot:** "Sorry, I can't process voice notes." | `t("errors.voiceNoteNotAccepted")` — no state change |

---

## State machine summary

```
intake
  ↓ (outputType picked + description typed + structured params + optional: reference images)
uploading  ←──────────────────────────────────────────────┐
  ↓ (done uploading)                                       │ (has_images)
briefing ←────────────────────────────────────────────────┘
  ↓ (brief_approved)
  ├─ image / audio → generating → awaiting_payment → delivering → feedback → completed
  └─ video → planning → confirming → generating → awaiting_payment → delivering → feedback → completed

Any state + "hi" / "reset" → intake
awaiting_payment + any message → nudge to pay (no transition)
```
