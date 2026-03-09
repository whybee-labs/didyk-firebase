# Whybee — Claude Project Rules

## Stack
- Firebase Functions (Node 20, TypeScript) in `functions/src/`
- Firestore (conversation state, orders)
- Firebase Storage (generated media — not yet implemented)
- WhatsApp Cloud API (Meta) for all user interactions
- Razorpay for payments
- Groq (`llama-3.1-8b-instant`) via OpenAI-compatible SDK for LLM calls

## Project Structure
```
functions/src/
  api/              # Firebase Function entry points
  config/
    env.ts          # Firebase secrets (GROQ_API_KEY, WHATSAPP_*, RAZORPAY_*)
    flows/          # Per-flow config (birthday, shop, event)
  services/
    conversation/   # State machine: discovery → refining → confirming → generating → awaiting_payment
    generators/     # Output stubs: video, image, pdf, audio, text
    llm/            # callOpenAI() — wraps Groq via OpenAI SDK
    payments/       # Razorpay createPaymentLink
    whatsapp/       # Senders (text, video, image, audio, document, buttons) + webhook parser
docs/               # Architecture docs — keep updated when business logic changes
```

## Coding Rules
- Use absolute imports (`baseUrl: src` is set in tsconfig) — e.g. `import { X } from "services/foo/bar"` not `../../services/foo/bar`
- Never use relative imports with `../` — always use absolute paths from `src/`
- Deploy: `firebase deploy --only functions` (predeploy build runs automatically)
- Never mention "video creation" in user-facing copy — use "content" instead

## Docs Rule
**Whenever business logic is changed** (conversation states, flow configs, payment flow, media generation, WhatsApp integration), update the relevant file in `docs/`. The docs are:
- `docs/conversation-engine.md` — state machine, transitions, handleIncomingMessage routing
- `docs/flows.md` — flow configs, fields, outputs, pricing
- `docs/data-model.md` — Firestore schema
- `docs/payment.md` — Razorpay integration, webhook
- `docs/media-generation.md` — generator stubs, Firebase Storage plan
- `docs/whatsapp-integration.md` — senders, webhook, Meta API setup

## Testing
- Send "hi" to reset conversation to discovery from any state
- Test media buttons in discovery: Video, Image, Audio, PDF, Text
- Pricing stored in INR (not paise) — `createPaymentLink` multiplies by 100
