# Media Generation

After the user confirms their order, `startFulfillment()` generates all outputs defined in the flow config and delivers them via WhatsApp before requesting payment.

---

## How It Works

`services/conversation/fulfillment.ts`

```
startFulfillment(phone, session)
  │
  ├── set status: "generating"
  ├── send "🎬 Here's your preview!"
  │
  ├── for each output in config.outputs:
  │     result = await output.generate(session.collectedData)
  │     await dispatchOutput(phone, output.type, result)
  │
  ├── createPaymentLink(...)
  ├── send payment link message
  └── set status: "awaiting_payment"
```

`dispatchOutput` maps `OutputType` to the right WhatsApp sender:

| OutputType | WhatsApp sender | Input |
|------------|----------------|-------|
| `video` | `sendVideo(phone, url)` | public video URL |
| `image` | `sendImage(phone, url)` | public image URL |
| `pdf` | `sendDocument(phone, url, filename)` | public PDF URL |
| `audio` | `sendAudio(phone, url)` | public audio URL |
| `text` | `sendText(phone, message)` | message string |

---

## Generator Stubs

**Location:** `services/generators/`

Each generator is a function:
```ts
(data: Record<string, unknown>) => Promise<string>
```
- For media types: returns a publicly accessible URL (hosted on Firebase Storage, CDN, etc.)
- For `text` type: returns the message string to send

| Generator | File | Current stub |
|-----------|------|-------------|
| `generateVideo` | `videoGenerator.ts` | Google sample MP4 |
| `generateImage` | `imageGenerator.ts` | placehold.co 1280×720 |
| `generatePdf` | `pdfGenerator.ts` | W3C sample PDF |
| `generateAudio` | `audioGenerator.ts` | W3C sample MP3 |
| `generateText` | `textGenerator.ts` | OpenAI `gpt-4.1-nano` generates personalized message |

The `data` argument is `session.collectedData` — it contains all fields collected during the conversation (text fields from the form + media IDs from the LLM phase).

---

## Text Generator

`textGenerator.ts` is the only generator that's not a stub — it already calls OpenAI:

- System prompt: "Generate a short, warm, personalized message based on the provided data"
- Passes `collectedData` as JSON
- Returns 2–4 sentence message (no JSON wrapping, plain text)
- Model: `gpt-4.1-nano` via `callOpenAI()` in `services/llm/openai.ts`

Note: `callOpenAI` normally uses `json_object` response format for the flow engine. The text generator calls it with free text output — make sure the OpenAI call in `textGenerator.ts` does NOT use `json_object` format (the system prompt already guides this correctly).

---

## Replacing a Stub with a Real Service

1. Open the generator file (e.g. `videoGenerator.ts`)
2. Replace the placeholder URL with a real API call using the `data` argument
3. Upload the result to Firebase Storage if needed → return the public download URL
4. The rest of the pipeline (fulfillment + WhatsApp sending) doesn't change

Example pattern:
```ts
export async function generateVideo(data: Record<string, unknown>): Promise<string> {
  const result = await myVideoService.render(data);
  const ref = storage.bucket().file(`videos/${result.id}/output.mp4`);
  await ref.save(result.buffer);
  return await ref.getSignedUrl({ action: "read", expires: "2099-01-01" })[0];
}
```

---

## WhatsApp Senders

All senders in `services/whatsapp/` call `sendWhatsAppRequest()` internally.

| File | Function | Use |
|------|----------|-----|
| `sendText.ts` | `sendText(phone, text)` | Plain text message |
| `sendVideo.ts` | `sendVideo(phone, url)` | MP4 video by URL |
| `sendImage.ts` | `sendImage(phone, url)` | Image by URL |
| `sendDocument.ts` | `sendDocument(phone, url, filename)` | PDF or any document |
| `sendAudio.ts` | `sendAudio(phone, url)` | Audio by URL |
| `sendButtons.ts` | `sendButtons(phone, body, buttons)` | Up to 3 quick reply buttons |
| `sendTemplate.ts` | `sendTemplate(phone, name, lang, params)` | Approved Meta template |
| `sendFlow.ts` | `sendFlow(phone, flowId)` | Open a WhatsApp Form |
| `sendCarousel.ts` | `sendCarousel(phone, template, lang, cards)` | Carousel template |

All media senders use `{ link: url }` — Meta fetches the URL directly. URLs must be publicly accessible.
