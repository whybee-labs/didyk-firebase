# WhatsApp Webhook Payload Parser Specification

## Goal

Create a reusable utility that parses incoming WhatsApp webhook payloads from the Meta WhatsApp Cloud API and converts them into a normalized message format used internally by the system.

The parser should extract key information such as:

* sender phone number
* message type
* message content
* media information
* interactive responses

The output should be a clean, consistent object so the rest of the backend does not need to deal with Meta's nested payload structure.

---

# File Location

services/whatsapp/parseWebhookPayload.ts

---

# Input

The parser receives the raw webhook request body from Meta.

Example raw payload:

```
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "919876543210",
                "id": "wamid.HBgM...",
                "timestamp": "1710000000",
                "type": "text",
                "text": {
                  "body": "Hi"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

# Output Format

The parser should return a normalized object like this:

```
{
  phone: "919876543210",
  messageId: "wamid.HBgM...",
  timestamp: "1710000000",
  type: "text",
  text: "Hi",
  mediaUrl: null,
  buttonId: null,
  listId: null
}
```

---

# Supported Message Types

The parser must support the following message types.

---

## Text Message

Example payload section:

```
{
  "type": "text",
  "text": {
    "body": "Hello"
  }
}
```

Output:

```
type = "text"
text = "Hello"
```

---

## Image Message

Example payload:

```
{
  "type": "image",
  "image": {
    "id": "MEDIA_ID"
  }
}
```

Output:

```
type = "image"
mediaId = MEDIA_ID
```

Media must later be downloaded using:

GET /MEDIA_ID

---

## Video Message

Example payload:

```
{
  "type": "video",
  "video": {
    "id": "MEDIA_ID"
  }
}
```

Output:

```
type = "video"
mediaId = MEDIA_ID
```

---

## Button Reply

Example payload:

```
{
  "type": "interactive",
  "interactive": {
    "type": "button_reply",
    "button_reply": {
      "id": "birthday",
      "title": "Birthday video"
    }
  }
}
```

Output:

```
type = "button_reply"
buttonId = "birthday"
text = "Birthday video"
```

---

## List Reply

Example payload:

```
{
  "type": "interactive",
  "interactive": {
    "type": "list_reply",
    "list_reply": {
      "id": "shop",
      "title": "Shop promotion"
    }
  }
}
```

Output:

```
type = "list_reply"
listId = "shop"
text = "Shop promotion"
```

---

# Function Signature

```
parseWebhookPayload(payload): ParsedMessage | null
```

Return null if no message is found.

---

# Type Definition

```
ParsedMessage = {
  phone: string
  messageId: string
  timestamp: string
  type: string
  text?: string
  mediaId?: string
  buttonId?: string
  listId?: string
}
```

---

# Implementation Steps

1. Safely access nested fields:

payload.entry[0].changes[0].value.messages[0]

2. Extract sender:

message.from

3. Extract message type:

message.type

4. Based on type, extract content.

5. Return normalized object.

---

# Example Usage

Inside webhook handler:

```
const parsed = parseWebhookPayload(req.body)

if (!parsed) return

await handleIncomingMessage(parsed.phone, parsed)
```

---

# Benefits

This utility ensures:

* clean webhook handlers
* consistent message structure
* easy support for new message types
* easier debugging

---

# Optional Logging

Log raw payloads during development to detect new message types.
