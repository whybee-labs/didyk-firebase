# Whybee — AI Generation Architecture

## Vision

Whybee is a WhatsApp-native AI content generation bot. Users describe what they want in plain language, the bot gathers context through structured conversation, and AI models produce the final image or video — delivered directly on WhatsApp.

No app. No frontend. No templates. Pure AI output.

---

## Output Types

Three output types. Everything else is derived from these.

| Type | Input | AI Model | Delivery |
|------|-------|----------|----------|
| Image | Text + optional reference images | Fal.ai / Stability | Sent directly on WhatsApp |
| Video | Text + optional reference images | Veo / Runway / Kling | Firebase Storage URL (>16MB limit) |
| Audio | Text (lyrics, poem, any copy) | Suno / Udio / ElevenLabs | WhatsApp audio message |

**Audio use cases:** rap from random text, poem → song, jingle from a business description, birthday song, motivational speech. Fast to generate (~10–20s), no scene planning needed — closer to the image flow than video.

---

## Conversation Flow

```
intake
  → uploading       (if user has reference images)
  → briefing        (LLM gathers creative context)
  → planning        (video only: scene plan + music)
  → confirming      (user reviews full summary)
  → generating      (async job)
  → awaiting_payment
  → delivering
  → feedback
```

### State descriptions

| State | What happens |
|-------|-------------|
| `intake` | Collect output type (image/video), platform, style via buttons |
| `uploading` | User sends reference images → downloaded from Meta, stored in Firebase Storage |
| `briefing` | LLM asks structured questions to enrich creative context. Loops until brief is ready. |
| `planning` | (Video only) LLM generates scene plan, music direction, colour palette. User reviews. |
| `confirming` | (Video only) Full brief summary. User taps Confirm or Edit. |
| `generating` | Async job running. Image: fast. Video: 30s–5min. |
| `awaiting_payment` | Razorpay link sent before final generation. |
| `delivering` | Send result to user (image direct, video as Storage URL). |
| `feedback` | Star rating prompt. |

---

## Two Data Buckets

This is the core design principle. Data is split into two separate Firestore fields on the conversation document.

### `structuredData` — we own this

Collected via buttons in the intake flow. Maps 1:1 to AI model API parameters. The LLM never writes to this.

```ts
{
  outputType: "image" | "video" | "audio"

  // Image
  platform: "instagram_post" | "instagram_story" | "whatsapp_status" | "youtube_thumbnail" | "general"
  style: "photorealistic" | "illustrated" | "cinematic" | "minimal"

  // Video (additional)
  duration: 5 | 10 | 15 | 30          // seconds
  aspectRatio: "1:1" | "9:16" | "16:9" // derived from platform, never asked directly

  // Audio (additional)
  genre: "rap" | "pop" | "cinematic" | "folk" | "jingle"
  mood: "energetic" | "calm" | "dramatic" | "fun"

  // Image + Video
  referenceImageUrls: string[]          // Firebase Storage URLs — empty means no references
}
```

Platform → aspect ratio derived automatically (user never sees "aspect ratio"):

| Platform | Aspect Ratio |
|----------|-------------|
| instagram_post | 1:1 |
| instagram_story | 9:16 |
| instagram_reel | 9:16 |
| whatsapp_status | 9:16 |
| youtube_shorts | 9:16 |
| youtube | 16:9 |
| youtube_thumbnail | 16:9 |
| general | 1:1 |

### `unstructuredData` — LLM owns this

Free-form context gathered by the LLM during the briefing loop. Not typed or validated. Accumulated as a context dump and fed back to the LLM when generating the creative brief, scene plan, and prompts.

```ts
{
  // Examples — LLM decides what to ask
  purpose: "devotional"
  tone: "spiritual and grand"
  occasion: "Ram Navami"
  extraContext: "The moment Rama and Krishna meet in Vrindavan"
  hasVoiceover: true
  language: "Hindi"
  // ...anything the LLM deems useful
}
```

**Rule:** `structuredData` flows to API params. `unstructuredData` flows into LLM prompts.

---

## Briefing Loop

The briefing loop is the core of the conversational experience. The LLM acts as a creative director interviewing the user.

### How it works

1. User sends their initial idea ("Rama and Krishna")
2. LLM receives: `structuredData` + `unstructuredData` so far + user message
3. LLM decides: do I have enough context to write a good creative brief?
4. If not ready: returns a structured question
5. Backend renders the question as the right WhatsApp component
6. User answers → stored in `unstructuredData`
7. Repeat until ready

### LLM response schema

```ts
// Not ready — ask a question
{
  ready: false,
  question: {
    key: string           // field name to store answer under in unstructuredData
    type: "list" | "boolean" | "text"
    text: string          // the question to show the user

    // Only for type === "list"
    options?: Array<{
      id: string
      label: string
    }>
  }
}

// Ready — brief is complete
{
  ready: true,
  enrichedPrompt: string  // rich, detailed creative brief for generation
}
```

When `ready: true`, the bot sends the `enrichedPrompt` to the user and asks:
> "Here's my understanding of your idea — does this look right, or should we add more detail?"

- User says looks good → video: move to `planning`; image/audio: move straight to `generating`
- User says needs more / adds context → set `ready = false`, feed their reply back into the briefing loop and continue

This gives the user full control over the creative brief before any generation starts.

### WhatsApp rendering per question type

| type | WhatsApp component | User reply type |
|------|--------------------|----------------|
| `list` | List picker (sendList) | `list_reply` |
| `boolean` | Yes / No buttons (sendButtons) | `button_reply` |
| `text` | Plain text message (sendText) | `text` |

### Pending question tracking

While waiting for the user to answer, the conversation stores:
```ts
pendingQuestion: { key: string, type: "list" | "boolean" | "text" }
```
On next user message, the backend maps the reply to `unstructuredData[pendingQuestion.key]`, clears `pendingQuestion`, then calls the LLM again.

---

## Planning Phase (Video Only)

Once the brief is ready, the LLM generates a structured production plan:

```ts
{
  scenePlan: Array<{
    id: string
    description: string       // what happens in this scene
    visualPrompt: string      // prompt sent to image/video model
    durationSec: number
  }>
  musicDirection: string      // e.g. "classical carnatic, slow tempo, flute lead"
  colourPalette: string       // e.g. "warm gold, deep saffron, soft white"
  voiceover: boolean
}
```

This is shown to the user as a text summary. They can approve or request edits before generation begins.

---

## Async Job System (Video)

Video generation takes 30s–5min. It cannot block the webhook response.

```
fulfillment.ts
  → create Runway job
  → save jobId to Firestore
  → set status = "generating"
  → reply "Working on it..." on WhatsApp
  → return (webhook closes)

checkVideoJob.ts (Cloud Tasks, scheduled)
  → poll Runway for job status
  → on complete: upload to Firebase Storage
  → send download URL via WhatsApp
  → set status = "awaiting_payment" or "delivering"
```

Video is always delivered as a Firebase Storage download URL — never uploaded directly to WhatsApp (16MB limit).

---

## AI Models

Not finalised yet. Candidates:

| Output | Candidates |
|--------|-----------|
| Image | Fal.ai FLUX, Stability, GPT-4o image |
| Video | Veo, Runway Gen-3, Kling |
| Audio | Suno, Udio, ElevenLabs |

**For now:** video generator returns a stock video URL placeholder. Real model integration happens once the model decision is made. One file to swap (`services/generators/videoGenerator.ts`) — everything else stays the same.

Model keys stored as Firebase secrets when ready: `FAL_API_KEY`, `RUNWAY_API_KEY`, etc.

---

## Intents

Intents sit between the output type and the briefing loop. After intake, one LLM call classifies the user's request into an intent. The intent then shapes how the briefing loop runs — what fields it must collect, and how it guides the conversation.

### Why intents

The same output type (audio) can have very different requirements:
- "make a rap from my bio" → needs source text, rap style, theme
- "create a jingle for my bakery" → needs brand name, product, target feeling
- "poem into a song" → needs the poem, genre, tempo

Without intents, the LLM has to figure all of this out from scratch every time. With intents, it gets a config that tells it exactly what to gather.

### Intent config

```ts
interface Intent {
  id: string
  outputType: "image" | "video" | "audio"

  // For LLM classification
  description: string      // what this intent is in one sentence
  examples: string[]       // real things users say when they want this

  // For briefing loop
  requiredFields: string[] // LLM must collect ALL of these before ready:true
  briefingInstructions: string  // how to drive the conversation for this intent
}
```

### Classification

After the user picks an output type and sends their first message, one LLM call classifies silently:
- Input: user's message + all intent `description` + `examples` for that output type
- Output: `{ intentId: "rap_from_text" }` or `{ intentId: "generic_audio" }`

Stored on the conversation as `intentId`. **Never reclassified** — classify once, stick with it. If uncertain, fall back to generic.

### Fallback

Every output type has a generic intent (`generic_image`, `generic_video`, `generic_audio`) with no `requiredFields` and minimal `briefingInstructions`. Pure LLM judgement.

### Discovery message (dynamic)

After user picks output type, bot sends a friendly message built dynamically from the intents registry:

```ts
function buildDiscoveryMessage(outputType: OutputType): string {
  const capabilities = intents
    .filter(i => i.outputType === outputType && i.id !== `generic_${outputType}`)
    .map(i => i.label)
    .join(", ");
  return `I can create ${capabilities} — just tell me what you have in mind!`;
}
```

Each intent has a `label` field (e.g. `"rap songs from text"`, `"brand jingles"`). Adding a new intent automatically updates the discovery message — no copy to maintain.

### Initial intents

```ts
// Audio
{ id: "rap_from_text", outputType: "audio",
  description: "Turn a piece of text, bio, or topic into a rap song",
  examples: ["make a rap about my company", "rap version of my bio", "create a diss track"],
  requiredFields: ["sourceText", "rapStyle", "theme"],
  briefingInstructions: "Collect the source text or topic to rap about. Ask about the vibe — aggressive, funny, hype. Ask what message they want to land." }

{ id: "product_jingle", outputType: "audio",
  description: "Create a catchy jingle or audio ad for a product or business",
  examples: ["jingle for my bakery", "audio ad for my app", "catchy tune for my brand"],
  requiredFields: ["brandName", "product", "targetFeeling"],
  briefingInstructions: "Collect brand name, what they sell, and the feeling they want the jingle to evoke." }

// Video
{ id: "product_promo_video", outputType: "video",
  description: "Promotional video for a product or business",
  examples: ["promo video for my shoe brand", "ad for my restaurant", "product launch video"],
  requiredFields: ["productName", "keyMessage", "targetAudience"],
  briefingInstructions: "Collect product/business name, the core message, and who it's for." }

// Image
{ id: "product_poster", outputType: "image",
  description: "Promotional poster or banner for a product or event",
  examples: ["poster for my event", "sale banner for my shop", "product launch graphic"],
  requiredFields: ["productName", "keyMessage"],
  briefingInstructions: "Collect what's being promoted and the key message to highlight." }
```

New intents added as patterns emerge from real user requests.

---

## Pricing

Not finalised. Pricing is complex — it depends on conversation length, output type, how much heavy lifting the AI did, reference image count, etc. May eventually be LLM-powered (LLM computes the price based on the job).

**For now:** preview is free. Final output has a static placeholder price. Clean pricing model designed once the product is stable.
