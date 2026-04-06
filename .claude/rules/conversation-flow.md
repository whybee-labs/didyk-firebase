---
description: Conversation state machine rules and data bucket constraints
---

State machine: intake → drafting → awaiting_payment → generating → delivering → feedback → completed

- `intake`: show output type buttons (Image/Video/Audio), then user describes idea. Creative Director classifies + drafts.
- `drafting`: Creative Director conversation. Asks smart creative questions, generates enriched prompt. User can edit, add photos, or create.
- `uploading`: sub-flow from `drafting` for reference images (up to 5). Returns to `drafting`.
- `planning` and `confirming`: video-only, reserved for future use.
- Pay-first flow: "Create now" → payment link → `awaiting_payment` → webhook → generate → deliver. No generation before payment.
- `structuredData.outputType` and `structuredData.aspectRatio` set by intake/Creative Director. `referenceImageUrls` set by user uploads.
- `unstructuredData` is LLM-owned: `_enrichedPrompt`, `_title`, `_style`, `_mood`, `_aspectRatio`.
- `processing` flag (boolean) on conversation doc prevents double-handling during async operations (LLM calls, image uploads, generation).
- Creative Director chooses question UI dynamically: buttons (up to 3), list, or text.
- `pendingQuestion` tracks the expected reply type so the next message can be mapped correctly.
- Payment links always via `sendCTAButton` — never a raw URL in a text message.
- On generation error post-payment, fall back to `status: "drafting"`.
