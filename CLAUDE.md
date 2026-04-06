# Whybee

WhatsApp-native AI content generation bot. Users describe what they want, the bot gathers context conversationally, and AI produces the final image, video, or audio — delivered directly on WhatsApp.

## Stack
- **Firebase Functions** (Node 20, TypeScript) in `functions/src/`
- **Firestore** — conversation state, user records, orders
- **Firebase Storage** — generated media
- **WhatsApp Cloud API** (Meta) — all user interactions
- **Razorpay** — payments
- **OpenAI** — LLM (`gpt-4o-mini`, secret: `OPENAI_API_KEY`) — Creative Director + classification
- **Google Gemini** — image generation (`gemini-3.1-flash-image-preview`, secret: `GOOGLE_GENAI_API_KEY`)

## Project Structure
```
functions/src/
  api/                  # Firebase Function entry points
  config/
    env.ts              # Firebase secrets
    intents/            # Intent registry (legacy, kept for backward compat)
    prompts/            # LLM system prompts (creativeDirector.ts)
    products/           # StructuredData / UnstructuredData / PendingQuestion types
    translations.json   # ALL user-facing copy lives here
  types/
    conversation.ts     # Shared: Conversation, ConversationStatus, HistoryEntry
  utils/
    t.ts                # t(key, vars?) — translation helper
  services/
    conversation/       # State machine handlers
    generators/         # imageGenerator (real), videoGenerator, audioGenerator (stubs)
    llm/                # callOpenAI() + Creative Director LLM service
    payment/            # createPaymentLink (Razorpay)
    whatsapp/           # Senders + webhook parser
docs/                   # Architecture docs — keep updated (see .claude/rules/docs.md)
```

## Conversation Flow
```
intake → drafting → awaiting_payment → generating → delivering → feedback → completed
```
- `intake`: output type buttons (Image/Video/Audio) + first description
- `drafting`: Creative Director asks smart questions, generates brief, user creates or edits
- Pay-first: no generation until payment. Draft summary = preview.
- `uploading`: sub-flow from `drafting` for reference images
- `planning`/`confirming`: future video-only states
- `processing` flag on conv doc prevents double-handling during async ops

See `.claude/rules/conversation-flow.md` for full constraints.

## Key Rules
- All imports are absolute from `src/` — see `.claude/rules/imports.md`
- All user-facing copy in `translations.json` — see `.claude/rules/copy.md`
- Update docs on every business logic change — see `.claude/rules/docs.md`

## Deploy
```
npm run deploy:prod     # from functions/
npm run deploy:staging
```
Pricing in INR (not paise) — `createPaymentLink` multiplies by 100.
