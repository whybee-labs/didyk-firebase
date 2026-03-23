# Resume Flow — Full Specification & Planning Document

**Purpose:** A clear, end-to-end spec for Claude (or any developer) to understand how the Whybee resume flow should work. Use this for planning and implementation — not as a code reference, but as the source of truth for desired behavior.

---

## Part 1: The User Journey (Story from Start to Finish)

### Step 1 — User says "Hi" (or anything)

**What happens:**
1. User sends "hi" (or any text, or starts fresh)
2. Bot sends **two messages**:
   - **Message 1:** Welcome text + **3 quick-reply buttons**: 🎂 Birthdays (soon), 🎉 Events (soon), 📄 Resume
   - **Message 2:** Browse list — "📂 Browse categories" with a list of 5 categories (Memories, Invitations, Business, Social Media, Documents)

**Expected behavior:**
- Only **Resume** is live. Birthdays and Events are placeholders.
- If user taps **Birthdays** or **Events** → we say **"🚧 Coming soon! For now, try *Resume*."** and re-send the welcome.
- If user taps **Resume** → go to Step 2.
- If user selects a **category** from the browse list → show products in that category. If they pick a non-Resume product → same "Coming soon" message.

---

### Step 2 — User selects Resume

**What happens:**
1. User taps "📄 Resume" (from popular buttons) or navigates Browse → Career → Resume
2. Bot sends:
   - Sample image(s) showing all 9 templates
   - Text: "We have 9 templates in the picture above. In the *next message*, tap *Choose* to open the list and pick one 👇🏻"
   - A **list message** with 9 template options (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)

**Expected behavior:**
- User must pick one template to continue.

---

### Step 3 — User picks a template

**What happens:**
1. User selects a template (e.g. "Lunar", "Pulsar")
2. Bot sends colour options:
   - Either background colours (for templates that support it) or accent colours
   - User picks one colour

**Expected behavior:**
- Colour choice is stored. Flow moves to input method.

---

### Step 4 — How to start: Upload PDF or Build from scratch

**What happens:**
1. Bot sends: "How would you like to start?"
2. **Two buttons:**
   - **"Upload your PDF"** → should be changed to **"Upload your old PDF"** or **"Upload existing PDF"** (user requested this)
   - **"Build from scratch"** → starts with empty form

**Expected behavior:**
- **Upload your old PDF** → go to Step 5 (waiting for PDF)
- **Build from scratch** → go directly to refining (LLM collects name, role, etc.)

---

### Step 5 — User uploads PDF

**What happens:**
1. Bot says: "📄 Send your resume PDF and I'll read it."
2. User sends a PDF document (not a photo)
3. We:
   - Download the PDF
   - Extract text with pdf-parse
   - Send raw text to LLM with a **resume schema** (see Part 3)
   - LLM returns structured JSON (firstName, lastName, experience, projects, etc.)
   - We parse and validate; store in `collectedData`

**Expected behavior:**
- If PDF fails to parse → "😔 I couldn't read that PDF. Try another file or choose *Build from scratch*."
- If user sends a photo instead of PDF → "Please send a PDF document (not a photo)."
- On success → go to Step 6.

---

### Step 6 — Show parsed data in 3 messages + 4th prompt

**What happens:**
1. After successful parse, we send **exactly 4 messages** in sequence:
   - **Message 1:** Profile section — name, role, summary, contact (email, phone, LinkedIn, GitHub, website), education, skills. *No experience or projects.*
   - **Message 2:** Experience section — each job with title, company, dates, bullets, links
   - **Message 3:** Projects section — each project with name, description, bullets, links
   - **Message 4:** "📄 Review these 3 parts — profile, experience, and projects. When you're happy, type *done*. Otherwise, tell me what to edit and I'll update it."

2. User is now in **reviewing_resume** state.

**Expected behavior:**
- Three separate WhatsApp messages (not one long block). Easier to read on mobile.
- Fourth message is the instruction: type "done" or describe edits.

---

### Step 7 — User edits (the critical part)

**What happens:**
1. User says something like:
   - "Remove the bullet with lorem ipsum"
   - "Change the first bullet at Google to: Led the team"
   - "Add another project: XYZ"
   - "Fix the summary"
2. We must **understand precisely** and **change only what they asked** — never touch other fields.

**Expected behavior (non-negotiable):**
- **Precision:** "Remove bullet with lorem ipsum" → remove ONLY that bullet. All other bullets stay.
- **No hallucination:** Never invent companies, roles, or bullets. Use only what the user provided or what exists in `collectedData`.
- **Partial edits:** "Change first bullet at Google" → change only that bullet. Copy all others verbatim from existing data.
- **Additive edits:** "Add another project" → append the new project. Do not replace the whole projects array.
- **Default to no change:** If user says something ambiguous or just "ok" or "looks good" → do NOT output any extractedFields. Only change when they explicitly ask to change/add/remove/update.

After each edit, we re-send the 3 section messages (profile, experience, projects) + the 4th prompt. User can keep editing until they type "done".

---

### Step 8 — User types "done"

**What happens:**
1. User types "done"
2. We check required fields (firstName, lastName, targetRole). If missing → ask for them.
3. If complete → send confirmation summary + buttons: "✅ Looks good!" and "🔄 Start Over"

**Expected behavior:**
- "done" exits the review loop and moves to confirmation.

---

### Step 9 — Preview and post-preview options

**What happens:**
1. User taps "✅ Looks good!"
2. We generate **preview PDF** (with watermark)
3. We send: "📄 Here's your resume preview (with watermark)."
4. We send the preview PDF
5. We send **3 buttons**: "How would you like to proceed?"
   - **Get Final Resume** → creates payment link, sends CTA button → `awaiting_payment`
   - **Change Template** → goes back to template selection (collectedData preserved) → `selecting_usecases`
   - **Edit Details** → shows section review messages → `reviewing_resume` → user edits, types "done" → new preview

**Expected behavior:**
- Preview PDF filename: **`{firstName}_{lastName}__preview.pdf`** (double underscore before "preview")
- Status during this phase: `reviewing_preview`
- If user sends text instead of tapping a button, it's treated as an edit request (same as "Edit Details" but the edit is applied immediately)
- After "Edit Details" → editing → "done", a new preview is generated directly (skips re-confirmation since template/color are already selected)

---

### Step 10 — After payment

**What happens:**
1. User pays via Razorpay
2. Razorpay webhook fires `payment_link.paid`
3. We generate **final PDF** (no watermark)
4. We send: "🎉 Thank you so much! Your file is on its way..."
5. We send the final PDF with filename: **`{firstName}_{lastName}_resume.pdf`** (single underscore before "resume")
6. We ask for feedback

**Expected behavior:**
- Final PDF must be clean (no watermark).
- Filename must use the user's name so it's recognizable when they download.

---

## Part 2: Resume Data Schema (What We Send to the LLM)

The LLM must receive a **clear schema** so it knows exactly what structure to return. Here is the canonical schema:

```
## Resume data schema

- firstName: string (required)
- lastName: string (required)
- targetRole: string (required)
- summary: string (optional)
- education: array of { degree, school, startYear?, endYear, location?, details? } (optional)
- skills: array of strings (optional)
- experience: array of { title, company, startDate, endDate?, location?, bullets: string[], url? } (optional)
- projects: array of { name, description?, bullets?: string[], url? } (optional)
- email, phone, address, linkedin, github, website: string (optional)
- primaryColor: string hex e.g. #1a2744 (optional)
```

**How to send data to the LLM:**
1. **Schema block** — the structure above (no example values; the LLM should not copy example data)
2. **User's current data** — full `collectedData` JSON as the **source of truth**
3. **Indexed view** — for targeted edits:
   ```
   ### Experience (indexed for targeted edits):
     Experience 0: Software Intern at Google
       Bullet 0: "Built X feature"
       Bullet 1: "Improved performance"
     Experience 1: Research Assistant at IIT
       Bullet 0: "..."
   ### Projects (indexed for targeted edits):
     Project 0: Portfolio Website
       Bullet 0: "..."
   ```
4. **User journey context** — status, product, selected template name + description, input method (upload/scratch), browse path, conversation turn count
5. **Instructions** — anti-hallucination rules, partial-edit rules, "default to no change when user has substantial data"

---

## Part 3: What Is Working vs What Should Change

### ✅ Working (or mostly working)

| Area | Status |
|------|--------|
| Discovery welcome (3 buttons + browse list) | ✅ |
| "Coming soon" for Birthdays, Events | ✅ |
| Resume → template list → colour → input method | ✅ |
| PDF upload, download, pdf-parse | ✅ |
| LLM extraction (schema, indexed view, anti-hallucination intent) | ⚠️ Implemented but may be fragile |
| 3-part section messages (profile, experience, projects) + 4th prompt | ✅ (in uncommitted code) |
| reviewing_resume state, "done" to exit | ✅ (in uncommitted code) |
| Confirmation, payment link, Razorpay webhook | ✅ |
| Final PDF delivery with `{name}_resume.pdf` | ✅ (in razorpayWebhook) |

### ❌ Should change

| Area | Current | Desired |
|------|---------|---------|
| Upload button label | "Upload your PDF" | "Upload your old PDF" or "Upload existing PDF" |
| Preview PDF filename | `{phone}-{cid}-preview` or `resume_preview.pdf` | `{firstName}_{lastName}__preview.pdf` |
| LLM provider | Gemini (uncommitted) | **Groq** (user wants to revert) |
| Partial-edit precision | Regex + heuristics; may fail | LLM must reliably do targeted edits only |

### ⚠️ Suspected issues

1. **Gemini vs Groq:** User switched from Groq to Gemini. If extraction/editing got worse, reverting to Groq is a valid first step to isolate whether the model is the problem.
2. **LLM prompt complexity:** The resume extraction + edit prompt is long. Groq (llama-3.1-8b-instant) may handle it differently than Gemini. Need to test both.
3. **JSON parsing:** Gemini sometimes returns markdown-wrapped JSON or trailing commas. We added `extractJsonFromResponse` and JSON5 fallback. If we revert to Groq, ensure Groq's JSON output is handled the same way.
4. **Indexed view clarity:** The LLM must map "first bullet at Google" → Experience 0, Bullet 0. If the indexed view is unclear or the model ignores it, edits will be wrong.

---

## Part 4: PDF Filename Convention

| Stage | Filename format | Example |
|-------|-----------------|---------|
| Preview (before payment) | `{firstName}_{lastName}__preview.pdf` | `John_Doe__preview.pdf` |
| Final (after payment) | `{firstName}_{lastName}_resume.pdf` | `John_Doe_resume.pdf` |

**Note:** Double underscore `__` before "preview" to distinguish from "resume". If name is missing, fallback to `resume__preview.pdf` and `resume_resume.pdf` (or similar).

---

## Part 5: Recommended Implementation Order (Planning Only)

1. **Revert LLM to Groq** — Change `openai.ts` back to Groq. Update env to use `GROQ_API_KEY`. Remove `GEMINI_API_KEY` from webhook secrets. Verify PDF parse and extraction still work.
2. **Change Upload button copy** — Update `resume.inputMethod.uploadButton` in translations.json.
3. **Fix preview PDF filename** — In fulfillment, when sending preview, compute `{firstName}_{lastName}__preview.pdf` from collectedData and pass to `sendDocument`. Handle missing name.
4. **Verify final PDF filename** — Razorpay webhook already uses `{fullName}_resume.pdf`. Ensure `fullName` is set from firstName+lastName when missing.
5. **Harden LLM extraction** — If Groq still misbehaves on partial edits, consider: (a) simplifying the prompt, (b) splitting "extract from PDF" vs "apply edit" into two calls, (c) adding more examples in the prompt for partial edits.
6. **Test end-to-end** — Hi → Resume → template → colour → Upload old PDF → parse → 3 messages + prompt → edit "remove bullet X" → done → confirm → pay → receive final PDF with correct filename.

---

## Part 6: Key Files Reference (for implementer)

| Concern | File(s) |
|--------|---------|
| LLM provider | `functions/src/services/llm/openai.ts` |
| Env / secrets | `functions/src/config/env.ts`, `functions/src/api/whatsappWebhook.ts` |
| Upload button copy | `functions/src/config/translations.json` → `resume.inputMethod.uploadButton` |
| PDF upload + 3-part review | `functions/src/services/conversation/resumePdfUpload.ts` |
| LLM extraction (schema, indexed view, instructions) | `functions/src/services/conversation/flowEngine.ts` → `extractWithLLM` |
| Preview PDF generation + filename | `functions/src/services/conversation/fulfillment.ts` |
| Final PDF after payment | `functions/src/api/razorpayWebhook.ts` |
| PDF generator (Storage filename) | `functions/src/services/generators/pdfGenerator.ts` |

---

*Document created for planning. Update this spec when behavior changes.*
