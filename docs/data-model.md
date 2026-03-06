# Data Model (Firestore)

---

## `users/{phone}`

Document ID is the user's E.164 phone number (e.g. `919876543210`).

| Field | Type | Description |
|-------|------|-------------|
| `phone` | string | Same as document ID |
| `activeSessionId` | string \| null | Points to the user's current session |
| `totalSessions` | number | Total sessions ever started |
| `firstSeenAt` | Timestamp | When the user first messaged |
| `lastSeenAt` | Timestamp | Updated on every incoming message |

A user always has at most one **active** session. A new session is created only when the current one is `completed` or has been idle for more than 8 hours.

---

## `conversations/{sessionId}`

Document ID is a Firestore auto-generated ID. Stored in `users/{phone}.activeSessionId`.

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Same as document ID |
| `phone` | string | E.164 phone number |
| `status` | ConversationStatus | Current state (see below) |
| `useCase` | string \| undefined | `"birthday"` \| `"shop"` \| `"event"` |
| `collectedData` | object | All fields collected during the conversation |
| `lastMessageAt` | Timestamp | Updated on every incoming message (used for idle timeout) |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | Updated on every status change |

### ConversationStatus values

| Status | Meaning |
|--------|---------|
| `discovery` | Intent not yet detected |
| `form_sent` | WhatsApp Form sent, waiting for submission |
| `refining` | LLM filling remaining fields conversationally |
| `confirming` | Confirmation sent, waiting for button tap |
| `generating` | Outputs being generated |
| `awaiting_payment` | Payment link sent, waiting for payment |
| `completed` | Payment received |
| `error` | Something went wrong |

### `conversations/{sessionId}/messages/{messageId}` (subcollection)

Every incoming message is appended here (fire-and-forget, does not block routing).

| Field | Type | Description |
|-------|------|-------------|
| `phone` | string | Sender's E.164 number |
| `messageId` | string | WhatsApp message ID |
| `timestamp` | string | WhatsApp-provided timestamp |
| `type` | string | `text`, `image`, `button_reply`, `form_reply`, etc. |
| `text` | string? | Present for text messages |
| `mediaId` | string? | Present for image/video/audio |
| `buttonId` | string? | Present for button replies |
| `formData` | object? | Present for form replies |
| `createdAt` | Timestamp | When this record was written |

### `collectedData` structure

Keys depend on the use case. Examples:

**Birthday:**
```json
{
  "recipientName": "Priya",
  "birthdayMessage": "Wishing you joy and happiness!",
  "images": ["media_id_1", "media_id_2"],
  "paymentLinkId": "plink_abc123"
}
```

**Shop:**
```json
{
  "shopName": "Ravi Stores",
  "description": "50% off all electronics this weekend",
  "images": ["media_id_1"],
  "paymentLinkId": "plink_def456"
}
```

**Event:**
```json
{
  "eventName": "Rahul's Wedding",
  "dateTime": "15 April 2025, 6:30 PM",
  "venue": "Grand Ballroom, Mumbai",
  "images": [],
  "paymentLinkId": "plink_ghi789"
}
```

- `images` contains **WhatsApp media IDs** (not URLs). These are passed to generators.
- `paymentLinkId` is set during fulfillment. Used to correlate the Razorpay webhook event.

---

## Session Lifecycle

A new conversation document is created in two cases:

```
User messages → getOrCreateSession()
  ├── users/{phone} exists with activeSessionId?
  │     └── conversations/{activeSessionId} exists?
  │           ├── status === "completed"?      → create new session
  │           ├── lastMessageAt > 8h ago?      → create new session
  │           └── otherwise                   → resume existing session
  └── users/{phone} doesn't exist?
        └── create user + new session
```

Old sessions (`completed`) are **never deleted** — they serve as history.

"Start Over" during confirmation resets the **same document** back to `discovery`
(clears `useCase` and `collectedData` — no new document created).

---

## Firestore Indexes

No composite indexes needed currently. All queries are single-document lookups by ID.

If you add analytics queries (e.g. "all completed sessions for this week"), add indexes in `firestore.indexes.json`.
