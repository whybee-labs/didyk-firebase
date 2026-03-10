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
| `useCase` | string \| undefined | `"birthday"` \| `"business"` \| `"event"` |
| `collectedData` | object | User-provided form inputs and media IDs |
| `browsePath` | string[] \| undefined | Catalog navigation trail (e.g. `["cat-memories", "prod-birthdays"]`) |
| `selectedUseCaseIds` | string[] \| undefined | Use case IDs selected at the selecting_usecases step |
| `paymentData` | object \| undefined | Payment metadata (see below) |
| `lastMessageAt` | Timestamp | Updated on every incoming message (used for idle timeout) |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | Updated on every status change |

### `paymentData` object

Set during fulfillment when the Razorpay payment link is created.

| Field | Type | Description |
|-------|------|-------------|
| `linkId` | string | Razorpay payment link ID — used to correlate the webhook event |
| `amount` | number | Amount in INR |
| `createdAt` | Timestamp | When the link was created |
| `paidAt` | Timestamp \| undefined | Set by webhook when payment is confirmed |

### ConversationStatus values

| Status | Meaning |
|--------|---------|
| `discovery` | Welcome sent, waiting for user to pick a product or browse |
| `browsing` | User navigating category/product catalog |
| `form_sent` | WhatsApp Form sent, waiting for nfm_reply submission |
| `refining` | LLM collecting remaining fields conversationally |
| `selecting_usecases` | User choosing what to create (use case list sent) |
| `confirming` | Confirmation sent, waiting for button tap |
| `generating` | Outputs being generated |
| `awaiting_payment` | Payment CTA sent, waiting for payment |
| `completed` | Payment received |
| `error` | Something went wrong |

### `conversations/{conversationId}/messages/{messageId}` (subcollection)

Every incoming message is appended here (fire-and-forget, does not block routing).

| Field | Type | Description |
|-------|------|-------------|
| `phone` | string | Sender's E.164 number |
| `messageId` | string | WhatsApp message ID |
| `timestamp` | string | WhatsApp-provided timestamp |
| `type` | string | `text`, `image`, `button_reply`, `list_reply`, `form_reply`, etc. |
| `text` | string? | Present for text messages |
| `mediaId` | string? | Present for image/video/audio |
| `buttonId` | string? | Present for button replies |
| `listId` | string? | Present for list replies |
| `formData` | object? | Present for form replies |
| `createdAt` | Timestamp | When this record was written |

### `collectedData` structure

Keys depend on the product. Examples:

**Birthday:**
```json
{
  "recipientName": "Priya",
  "birthdayMessage": "Wishing you joy and happiness!",
  "images": ["media_id_1", "media_id_2"]
}
```

**Business Promos:**
```json
{
  "shopName": "Ravi Stores",
  "description": "50% off all electronics this weekend",
  "images": ["media_id_1"]
}
```

**Event:**
```json
{
  "eventName": "Rahul's Wedding",
  "dateTime": "15 April 2025, 6:30 PM",
  "venue": "Grand Ballroom, Mumbai",
  "images": []
}
```

- `images` contains **WhatsApp media IDs** (not URLs). These are passed to generators.
- Payment data is stored in the separate `paymentData` field, not in `collectedData`.

---

## Conversation Lifecycle

A new conversation document is created in two cases:

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

"Start Over" during confirmation resets the **same document** back to `discovery`
(clears `useCase`, `collectedData`, `browsePath`, `selectedUseCaseIds` — no new document created).

Sending `"hi"` performs the same full reset from any status.

---

## Firestore Indexes

### Composite index required

The Razorpay webhook handler queries conversations by `paymentData.linkId`:

```ts
db.collection("conversations")
  .where("paymentData.linkId", "==", paymentLinkId)
  .limit(1)
```

This requires a **single-field index** (or composite) on `paymentData.linkId`. Add to `firestore.indexes.json` or create in the Firebase Console if queries fail.

If you add analytics queries (e.g. "all completed conversations for this week"), add composite indexes in `firestore.indexes.json`.
