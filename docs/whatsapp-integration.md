# WhatsApp Integration

The backend uses the **Meta WhatsApp Cloud API** to receive and send messages.

---

## Webhook Setup

**File:** `api/whatsappWebhook.ts`
**Firebase function:** `whatsappWebhook`

**Secrets required:**
- `WHATSAPP_VERIFY_TOKEN` — your custom token, configured in Meta dashboard
- `WHATSAPP_ACCESS_TOKEN` — from Meta app dashboard
- `WHATSAPP_PHONE_NUMBER_ID` — your WhatsApp Business phone number ID
- `OPENAI_API_KEY` — used by conversation engine (discovery + flow engine)

### Webhook Verification (GET)

Meta sends a GET request to verify the webhook endpoint:
```
GET /whatsappWebhook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
```

The handler validates `hub.verify_token` against `WHATSAPP_VERIFY_TOKEN` and echoes back `hub.challenge`. Returns 403 on mismatch.

### Incoming Messages (POST)

```
POST /whatsappWebhook
Body: Meta webhook payload
```

Response strategy: **respond 200 immediately**, then process asynchronously. This prevents Meta from retrying if processing takes a few seconds.

Processing:
1. `parseWebhookPayload(req.body)` → `ParsedMessage | null`
2. If null (e.g. status update, not a message) → ignore
3. `handleIncomingMessage(parsed.phone, parsed)` → full conversation engine

---

## Message Parsing

**File:** `services/whatsapp/parseWebhookPayload.ts`

Converts the deeply nested Meta payload into a flat `ParsedMessage`.

### Supported Types

| Type | Trigger | Key fields |
|------|---------|-----------|
| `text` | User sends plain text | `text` |
| `image` | User sends a photo | `mediaId` |
| `video` | User sends a video | `mediaId` |
| `audio` | User sends voice note | `mediaId` |
| `button_reply` | User taps a quick reply button | `buttonId`, `text` |
| `list_reply` | User selects from a list | `listId`, `text` |
| `form_reply` | User submits a WhatsApp Form (nfm_reply) | `formData` |
| `unknown` | Anything else | — |

### ParsedMessage Type

```ts
type ParsedMessage = {
  phone: string;
  messageId: string;
  timestamp: string;
} & (
  | { type: "text"; text: string }
  | { type: "image" | "video" | "audio"; mediaId: string }
  | { type: "button_reply"; buttonId: string; text: string }
  | { type: "list_reply"; listId: string; text: string }
  | { type: "form_reply"; formData: Record<string, unknown> }
  | { type: "unknown" }
)
```

### form_reply (WhatsApp Forms / nfm_reply)

When a user submits a WhatsApp Form, Meta sends an `interactive` message with `type: "nfm_reply"`. The `response_json` field is a JSON string containing all form values.

```json
{
  "type": "interactive",
  "interactive": {
    "type": "nfm_reply",
    "nfm_reply": {
      "response_json": "{\"recipient_name\": \"Priya\", \"birthday_message\": \"Happy Birthday!\"}"
    }
  }
}
```

Parsed result:
```ts
{ type: "form_reply", formData: { recipient_name: "Priya", birthday_message: "Happy Birthday!" } }
```

---

## Sending Messages

All senders call `sendWhatsAppRequest()` internally.

**Meta API endpoint:**
```
POST https://graph.facebook.com/v22.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer ACCESS_TOKEN
```

### Available Senders

**`sendText(phone, text)`** — plain text
**`sendButtons(phone, bodyText, buttons)`** — up to 3 quick reply buttons
```ts
buttons = [{ id: "birthday", title: "🎂 Birthday Video" }]
```

**`sendVideo(phone, url)`** — MP4 by URL
**`sendImage(phone, url)`** — image by URL
**`sendDocument(phone, url, filename)`** — PDF or any document
**`sendAudio(phone, url)`** — audio by URL
**`sendTemplate(phone, templateName, languageCode, bodyParams)`** — approved Meta template
**`sendFlow(phone, flowId)`** — opens a WhatsApp Form
**`sendCarousel(phone, templateName, languageCode, bodyParams, cards)`** — carousel template

All media senders use `{ link: url }` — Meta fetches the file directly from the URL. **URLs must be publicly accessible** (no auth, no signed URL expiry within the delivery window).

---

## WhatsApp Forms

WhatsApp Forms (formerly called Flows) let users fill structured data in a native UI instead of typing field by field.

- Triggered by `sendFlow(phone, flowId)`
- The `flowId` is the Meta Flow ID from the WhatsApp Manager dashboard
- Form submissions arrive as `nfm_reply` → parsed as `form_reply`
- Field names in the form JSON must match the `formKey` values in the flow config

Forms require approval from Meta before they can be sent in production. In test mode, you can send them to numbers registered in your Meta app.

---

## Carousel Messages

Carousels require a **pre-approved Meta template** with carousel cards. Use `sendCarousel()`.

- Up to 10 cards per carousel
- Each card: image header + optional body + quick reply buttons
- Button taps return as standard `button_reply` (same as regular buttons)

Currently used in discovery if you want to show the 3 use cases as a product catalogue instead of plain buttons.
