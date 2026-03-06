# Whybee Backend

WhatsApp-first AI service for creating shareable media (videos, images, PDFs) through a conversational interface.

Users chat with a WhatsApp bot → describe what they want → receive a preview → pay → get the final file.

---

## Tech Stack

- **Firebase Functions v2** — Node.js + TypeScript
- **Firestore** — session and user state
- **WhatsApp Cloud API** — messaging + forms
- **OpenAI gpt-4.1-nano** — intent detection + field extraction + text generation
- **Razorpay** — payment links + webhook
- **axios** — HTTP client for all external APIs

---

## Pipeline

```
User sends WhatsApp message
         ↓
   parseWebhookPayload
         ↓
   handleIncomingMessage  ← routes by session status
         ↓
   discovery              → intent detection (buttons or LLM)
         ↓
   form_sent              → WhatsApp Form sent, waiting for nfm_reply
         ↓
   refining               → LLM extracts remaining fields conversationally
         ↓
   confirming             → summary + [Create it!] [Start Over]
         ↓
   startFulfillment       → generate outputs → send via WhatsApp → payment link
         ↓
   awaiting_payment       → waiting for Razorpay webhook
         ↓
   completed              → "✅ Payment received!"
```

---

## Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `whatsappWebhook` | HTTPS | Receive + process WhatsApp messages |
| `razorpayWebhook` | HTTPS | Handle Razorpay payment events |
| `health` | HTTPS GET | Health check → `{ status: "ok" }` |

---

## Project Structure

```
functions/src/
├── index.ts                        — function exports
├── api/
│   ├── whatsappWebhook.ts
│   ├── razorpayWebhook.ts
│   └── health.ts
├── config/
│   ├── env.ts                      — Firebase Secrets
│   └── flows/
│       ├── types.ts                — FlowConfig, FlowField, FlowOutput
│       ├── birthday.ts
│       ├── shop.ts
│       ├── event.ts
│       └── index.ts
├── services/
│   ├── conversation/
│   │   ├── handleIncomingMessage.ts
│   │   ├── discovery.ts
│   │   ├── flowEngine.ts
│   │   ├── confirmation.ts
│   │   └── fulfillment.ts
│   ├── generators/
│   │   ├── videoGenerator.ts
│   │   ├── imageGenerator.ts
│   │   ├── pdfGenerator.ts
│   │   ├── audioGenerator.ts
│   │   └── textGenerator.ts
│   ├── whatsapp/
│   │   ├── client.ts
│   │   ├── parseWebhookPayload.ts
│   │   ├── sendText.ts
│   │   ├── sendButtons.ts
│   │   ├── sendVideo.ts
│   │   ├── sendImage.ts
│   │   ├── sendDocument.ts
│   │   ├── sendAudio.ts
│   │   ├── sendTemplate.ts
│   │   ├── sendFlow.ts
│   │   └── sendCarousel.ts
│   ├── payment/
│   │   └── createPaymentLink.ts
│   └── llm/
│       └── openai.ts
└── utils/
    └── firestore.ts
```

---

## Secrets

Set all secrets before deploying:

```bash
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
```

---

## Deploy

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

---

## Documentation

| Doc | What it covers |
|-----|---------------|
| [docs/conversation-engine.md](docs/conversation-engine.md) | Session model, status machine, routing, all 5 pipeline phases |
| [docs/flows.md](docs/flows.md) | FlowConfig schema, fields, outputs, how to add a new flow |
| [docs/media-generation.md](docs/media-generation.md) | Generators, OutputType, WhatsApp senders, replacing stubs |
| [docs/payment.md](docs/payment.md) | Razorpay: createPaymentLink, webhook, signature verification |
| [docs/whatsapp-integration.md](docs/whatsapp-integration.md) | Webhook setup, message types, all senders, Forms |
| [docs/data-model.md](docs/data-model.md) | Firestore schema: users, conversations, collectedData |
