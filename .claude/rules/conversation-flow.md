---
description: Conversation state machine rules and data bucket constraints
---

State machine: intake → uploading → briefing → planning* → confirming* → generating → awaiting_payment → delivering → feedback → completed (*video only)

- `structuredData` is collected via buttons only. The LLM never writes to it.
- `unstructuredData` is LLM-owned. All briefing answers go here.
- `planning` and `confirming` are video-only. Image/audio go from briefing straight to generating.
- Intent is classified once after the first user message. Never reclassify.
- Clear `pendingQuestion` before calling the LLM again in the briefing loop.
- Payment links always via `sendCTAButton` — never a raw URL in a text message.
- On fulfillment error, fall back to `status: "briefing"`.
