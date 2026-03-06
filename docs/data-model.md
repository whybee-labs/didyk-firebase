# Data Model (Firestore)

---

## `users/{phone}`

Document ID is the user's E.164 phone number (e.g. `919876543210`).

| Field | Type | Description |
|-------|------|-------------|
| `phone` | string | Same as document ID |
| `activeSessionId` | string \| null | Points to the user's current session |
| `totalSessions` | number | Total sessions ever started (including cancelled) |
| `firstSeenAt` | Timestamp | When the user first messaged |
| `lastSeenAt` | Timestamp | Updated on every incoming message |

A user always has at most one **active** session. When a session completes or is cancelled, `activeSessionId` stays pointing to it until the user starts a new one (which creates a new session doc and updates this field).

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
| `cancelled` | User started over or reset |
| `error` | Something went wrong |

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

```
User messages → getOrCreateSession()
  ├── users/{phone} exists with activeSessionId?
  │     └── conversations/{activeSessionId} exists and not cancelled/completed?
  │           └── YES → use existing session
  │           └── NO  → create new session, update activeSessionId
  └── users/{phone} doesn't exist?
        └── create user + session
```

Old sessions (cancelled/completed) are **never deleted** — they serve as a history.

---

## Firestore Indexes

No composite indexes needed currently. All queries are single-document lookups by ID.

If you add analytics queries (e.g. "all completed sessions for this week"), add indexes in `firestore.indexes.json`.
