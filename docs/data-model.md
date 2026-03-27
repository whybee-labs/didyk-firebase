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

---

## `conversations/{conversationId}`

Document ID is a Firestore auto-generated ID. Stored in `users/{phone}.activeConversationId`. The ID is **not** stored as a field — it is the document ID itself.

| Field | Type | Description |
|-------|------|-------------|
| `phone` | string | E.164 phone number |
| `status` | ConversationStatus | Current state (see below) |
| `intentId` | string \| undefined | Classified intent (e.g. `"rap_from_text"`, `"product_poster"`) |
| `structuredData` | StructuredData | Button-collected params: outputType, platform, style, etc. LLM never writes here. |
| `unstructuredData` | UnstructuredData | LLM-owned free-form context from briefing loop |
| `pendingQuestion` | PendingQuestion \| undefined | Active briefing question waiting for user reply |
| `messageHistory` | HistoryEntry[] \| undefined | LLM conversation context |
| `paymentData` | object \| undefined | Payment metadata (see below) |
| `feedbackData` | object \| undefined | Post-delivery rating |
| `lastMessageAt` | Timestamp | Updated on every incoming message (used for idle timeout) |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | Updated on every status change |

### `structuredData` object

Collected via buttons in the intake flow. Maps to AI model API parameters.

```ts
{
  outputType: "image" | "video" | "audio"

  // Image + Video
  platform?: string       // "instagram_post" | "whatsapp_status" | "youtube_thumbnail" | etc.
  style?: string          // "photorealistic" | "illustrated" | "cinematic" | "minimal"
  aspectRatio?: string    // derived from platform, never asked directly

  // Video
  duration?: number       // seconds: 5 | 10 | 15 | 30

  // Audio
  genre?: string          // "rap" | "pop" | "cinematic" | "folk" | "jingle"
  mood?: string           // "energetic" | "calm" | "dramatic" | "fun"

  // Image + Video
  referenceImageUrls: string[]  // Firebase Storage URLs — empty if no references
}
```

### `unstructuredData` object

Free-form context accumulated during the briefing loop. Keys are determined by the LLM (stored as `unstructuredData[pendingQuestion.key]`). Examples:

```ts
{
  _initialDescription: "make a rap about my startup",  // always saved from first message
  sourceText: "...",
  rapStyle: "hype",
  theme: "hustle and growth",
  // ...anything the LLM deems useful
}
```

### `pendingQuestion` object

Stored while the bot is waiting for the user to answer a briefing question.

```ts
{
  key: string                         // field name under unstructuredData
  type: "list" | "boolean" | "text"   // determines how the reply is parsed
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
| `intake` | Welcome sent; collecting output type, structured params, initial description |
| `uploading` | Collecting reference images from user |
| `briefing` | LLM question loop gathering creative context |
| `planning` | (Video only) LLM generating scene plan; user reviewing |
| `confirming` | (Video only) Final brief review before generation |
| `generating` | Output being generated |
| `awaiting_payment` | Preview sent + payment CTA sent; waiting for Razorpay webhook |
| `delivering` | Payment confirmed; sending final output |
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
