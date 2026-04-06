# Data Model (Firestore)

---

## `users/{phone}`

Document ID is the user's E.164 phone number (e.g. `919876543210`).

| Field | Type | Description |
|-------|------|-------------|
| `phone` | string | Same as document ID |
| `activeConversationId` | string \| null | Points to the user's current conversation |
| `totalConversations` | number | Total conversations ever started |
| `firstSeenAt` | Timestamp | When the user first messaged |
| `lastSeenAt` | Timestamp | Updated on every incoming message |

A user always has at most one **active** conversation. A new one is created only when the current one is `completed` or has been idle for more than 8 hours.

| `previewCount` | number | Rolling count of preview generations shown to this user |
| `previewWindowStart` | Timestamp \| undefined | Start of the current rolling window (reset when window expires) |

---

## `conversations/{conversationId}`

Document ID is a Firestore auto-generated ID. Stored in `users/{phone}.activeConversationId`. The ID is **not** stored as a field — it is the document ID itself.

| Field | Type | Description |
|-------|------|-------------|
| `phone` | string | E.164 phone number |
| `status` | ConversationStatus | Current state (see below) |
| `intentId` | string \| undefined | Legacy: classified intent (e.g. `"rap_from_text"`). Not used in new Creative Director flow. |
| `structuredData` | StructuredData | Minimal params: outputType, aspectRatio, referenceImageUrls. Creative Director sets aspectRatio. |
| `unstructuredData` | UnstructuredData | Creative Director-owned: `_title`, `_enrichedPrompt`, `_style`, `_mood`, `_aspectRatio` |
| `pendingQuestion` | PendingQuestion \| undefined | Active Creative Director question waiting for user reply |
| `messageHistory` | HistoryEntry[] \| undefined | LLM conversation context |
| `cleanUrl` | string \| undefined | Original full-quality output URL — set post-payment during `generateAndDeliver`, then delivered immediately |
| `previewUrl` | string \| undefined | Watermarked / low-res preview URL (legacy — not used in pay-first flow) |
| `processing` | boolean \| undefined | True while an async operation (LLM call, image upload, generation) is in progress. Prevents double-handling of messages. |
| `refinementCount` | number \| undefined | Times the user has gone back to drafting to refine within this conversation |
| `paymentData` | object \| undefined | Payment metadata (see below) |
| `feedbackData` | object \| undefined | Post-delivery rating |
| `lastMessageAt` | Timestamp | Updated on every incoming message (used for idle timeout) |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | Updated on every status change |

### `structuredData` object

Minimal button-collected params. The Creative Director infers style, mood, and aspect ratio from conversation context.

```ts
{
  outputType: "image" | "video" | "audio"
  aspectRatio?: string    // set by Creative Director ("1:1" | "9:16" | "16:9")
  referenceImageUrls: string[]  // Firebase Storage URLs — empty if no references

  // Legacy fields (old conversations only — no longer collected for new ones)
  platform?: string
  style?: string
  duration?: number
  genre?: string
  mood?: string
}
```

### `unstructuredData` object

Creative Director-managed fields. The CD stores its draft output here with underscore-prefixed keys.

```ts
{
  _title: "Short Catchy Title",              // set when CD returns ready:true
  _enrichedPrompt: "Vivid detailed brief...",// the full creative brief for the generator
  _style: "Cinematic",                       // inferred by CD
  _mood: "Bold",                             // inferred by CD
  _aspectRatio: "1:1",                       // mirrored from structuredData for display
  // ...any other keys from legacy briefing loop conversations
}
```

### `pendingQuestion` object

Stored while the bot is waiting for the user to answer a Creative Director question.

```ts
{
  key: string                         // field name under unstructuredData (typically "_lastAnswer")
  type: "list" | "boolean" | "text"   // determines how the reply is parsed ("boolean" used for buttons)
}
```

### `paymentData` object

Set during fulfillment when the Razorpay payment link is created.

| Field | Type | Description |
|-------|------|-------------|
| `linkId` | string | Razorpay payment link ID — used to correlate the webhook event |
| `amount` | number | Amount in INR |
| `currency` | string | `"INR"` |
| `createdAt` | Timestamp | When the link was created |
| `paidAt` | Timestamp \| undefined | Set by webhook when payment is confirmed |

### `feedbackData` object

Set after delivery when the user submits a rating.

| Field | Type | Description |
|-------|------|-------------|
| `rating` | string | Star rating from button reply (e.g. `"5"`) |
| `submittedAt` | Timestamp | When the rating was submitted |

### ConversationStatus values

| Status | Meaning |
|--------|---------|
| `intake` | Welcome sent; collecting output type, then first description triggers Creative Director |
| `uploading` | Collecting reference images from user (sub-flow from `drafting`) |
| `drafting` | Creative Director conversation loop — questions, draft summary, edits |
| `briefing` | *(Legacy)* Old LLM question loop — kept for backward compat |
| `planning` | *(Legacy, video only)* LLM generating scene plan; user reviewing |
| `confirming` | *(Legacy, video only)* Final brief review before generation |
| `generating` | Output being generated (post-payment) |
| `awaiting_payment` | Draft approved, payment CTA sent; waiting for Razorpay webhook |
| `delivering` | Payment confirmed; final output sent to user |
| `feedback` | Rating prompt sent; waiting for user response |
| `completed` | Conversation fully done |

---

## `conversations/{conversationId}/messages/{messageId}` (subcollection)

Every incoming message is appended here (fire-and-forget, does not block routing).

| Field | Type | Description |
|-------|------|-------------|
| `phone` | string | Sender's E.164 number |
| `messageId` | string | WhatsApp message ID |
| `timestamp` | string | WhatsApp-provided timestamp |
| `type` | string | `text`, `image`, `video`, `audio`, `button_reply`, `list_reply`, etc. |
| `text` | string? | Present for text messages |
| `mediaId` | string? | Present for image/video/audio messages |
| `buttonId` | string? | Present for button replies |
| `listId` | string? | Present for list replies |
| `createdAt` | Timestamp | When this record was written |

---

## Conversation Lifecycle

```
User messages → getOrCreateConversation()
  ├── users/{phone} exists with activeConversationId?
  │     └── conversations/{activeConversationId} exists?
  │           ├── status === "completed"?      → create new conversation
  │           ├── lastMessageAt > 8h ago?      → create new conversation
  │           └── otherwise                   → resume existing conversation
  └── users/{phone} doesn't exist?
        └── create user + new conversation
```

Old conversations (`completed`) are **never deleted** — they serve as history.

"hi" / "reset" / "start over" performs an in-place reset on the current doc back to `intake`
(clears intentId, structuredData, unstructuredData, pendingQuestion, messageHistory — no new document created).

---

## Firestore Indexes

### Composite index required

The Razorpay webhook handler queries conversations by `paymentData.linkId`:

```ts
db.collection("conversations")
  .where("paymentData.linkId", "==", paymentLinkId)
  .limit(1)
```

This requires a **single-field index** on `paymentData.linkId`. Add to `firestore.indexes.json` or create in the Firebase Console if queries fail.
