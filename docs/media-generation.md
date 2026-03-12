# Media Generation

After the user confirms their order, `startFulfillment()` generates all outputs defined in the flow config and delivers them via WhatsApp before requesting payment.

---

## How It Works

`services/conversation/fulfillment.ts`

```
startFulfillment(phone, conversation)
  │
  ├── set status: "generating"
  ├── send "🎬 Here's your preview!"
  │
  ├── for each output in config.outputs:
  │     result = await output.generate(conversation.collectedData)
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

## Generators

**Location:** `services/generators/`

Each generator is a function:
```ts
(data: Record<string, unknown>) => Promise<string>
```
- For media types: returns a publicly accessible URL (hosted on Firebase Storage, CDN, etc.)
- For `text` type: returns the message string to send

| Generator | File | Status |
|-----------|------|--------|
| `generateVideo` | `videoGenerator.ts` | Stub — Google sample MP4 |
| `generateImage` | `imageGenerator.ts` | Stub — placehold.co 1280×720 |
| `generatePdf` | `pdfGenerator.ts` | **Real** — pdfkit + Firebase Storage |
| `generateAudio` | `audioGenerator.ts` | Stub — W3C sample MP3 |
| `generateText` | `textGenerator.ts` | **Real** — Groq LLM generates personalized message |

The `data` argument is `conversation.collectedData` — it contains all fields collected during the conversation.

### PDF Generator

`pdfGenerator.ts` is a single adapter boundary. It:
1. Reads `data._template` to select a template (default: `"modern"`)
2. Reads `data._watermark` — `false` skips watermark for final post-payment delivery (default: `true`)
3. Renders via pdfkit using the template registry
4. Uploads to Firebase Storage → returns a download token URL

**Template registry:** `services/documents/templateRegistry.ts` maps template name → render function.

**Templates** (`services/documents/templates/`):

| Template key | File | Used by |
|---|---|---|
| `modern` | `resume/modern.ts` | Resume — two-column, blue header |
| `minimal` | `resume/minimal.ts` | Resume — single-column, ATS-friendly |
| `event-invite` | `events/event-invite.ts` | Events, parties |
| `birthday-invite` | `birthday/birthday-invite.ts` | Birthday, wedding invites |
| `business-promo` | `business/business-promo.ts` | Flyers, posters, brochures |

**Adding a new template:** create a file in the right subfolder exporting `render(doc, data)`, add one line to `templateRegistry.ts`.

**Template is passed via closure in product/catalog config:**
```ts
generate: (data) => generatePdf({ ...data, _template: "modern" })
```

**Storage:** uploaded to `documents/` folder in Firebase Storage bucket. Uses download token URLs (non-expiring, token-protected). Requires Firebase Storage to be enabled in the Firebase console.

**To swap to a third-party PDF service:** replace only `pdfGenerator.ts`. Interface stays the same.

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
