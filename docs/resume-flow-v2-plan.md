# Resume product flow v2 — Plan

## Target flow (your spec)

1. **User selects Resume** (from discovery).
2. **One photo + browse:** Send one image (later that image will show all 10 templates; for now one image is fine) and a **list of 9 templates** (chosen from the full set; catalog currently has 10 resume use cases).
3. **User selects one template.** Then:
   - **If bg-mode:** Tell user "We have more background colour options" and list them (e.g. Pale green, Pink, Mint, Sky blue, Cream for Pulsar).
   - **If text-mode:** Tell user "Single background, but you can pick any accent colour" and list accent options.
4. **Ask:** "Upload your existing PDF" **or** "Build from scratch". Copy must fit WhatsApp message length limits (~4096 chars; keep to one short message).
5. **If upload:** User sends PDF → we parse (pdf-parse + LLM) → we send back a short summary of what we understood (name, role, sections) → user can say add/remove/replace → LLM extracts edits and we merge (existing flow).
6. **Generate preview** with watermark and send.
7. **Ask** if they like it (Confirm: Looks good / Edit).
8. **Pay** → send final copy (no watermark).

---

## Current state vs changes

| Step | Current | Change |
|------|---------|--------|
| 1 | User taps Resume → we set `useCase: "resume"`, send image + list of all 10 templates | Keep; optionally restrict list to 9 templates (see questions). |
| 2 | One image + list (resumeFilter sends image + list) | Keep one image; ensure list shows 9 (or 10) templates. "Browse" = same list UX. |
| 3 | After template pick we go straight to refining (flowEngine opening prompt) | **New:** After template selection, **before** refining, add a step: detect bg vs text mode (from config), send one message listing colour options (backgrounds or accents), then collect colour choice (list/buttons). Store `selectedColor` (hex) in conversation. Then ask "Upload PDF" vs "Build from scratch". |
| 4 | N/A | **New:** New state or sub-step: "choose_input_method" → two options (Upload PDF / Build from scratch). Copy in `translations.json`, under WhatsApp length. |
| 5a | Refining: we only have "from scratch" (empty collectedData, flowEngine collects fields) | **New:** If "Build from scratch" → same as now (refining with empty data). If "Upload PDF" → we wait for document → download → pdf-parse → LLM → prefill `collectedData`, then send summary and enter refining so user can edit (add/remove/replace via existing LLM extraction). |
| 5b | N/A | **New:** PDF parsing: (1) Download document from WhatsApp, (2) pdf-parse(buffer) → text, (3) LLM prompt: "Map this resume text to JSON schema: fullName, targetRole, summary, experience[], education[], skills[], ...", (4) Parse JSON, validate with parseResumeData, (5) Prefill conversation.collectedData, (6) Send short summary (e.g. "We found: Name, Role, 3 jobs, 2 schools, 8 skills. Say what to add or change."). |
| 6–8 | Preview with watermark → Confirm → Pay → final | No change. Fulfillment already sends preview PDF, then payment CTA; payment webhook generates final and sends. |

---

## Where things live

- **Conversation states:** Add something like `selecting_color` and `choose_input_method` (or fold into refining with a "phase" field). After template pick: `selecting_color` → user picks colour → `choose_input_method` → user picks Upload / Scratch → then `refining` (with or without prefilled data).
- **Bg vs text mode:** Reuse the same config as preview: e.g. a shared module or catalog extension that exposes `{ mode: "background"|"text", colors: string[] }` per template id (e.g. `uc-resume-pulsar` → bg-mode, `uc-resume-astralis` → text-mode). Template id is already stored in `selectedUseCaseIds[0]`.
- **Colour choice in WhatsApp:** We cannot send real swatches. Send a **list** (or buttons) with labels: e.g. "Pale green", "Pink", "Mint", "Sky blue", "Cream" for Pulsar. Map list row id to hex in config. Store chosen hex in conversation (e.g. `selectedPrimaryColor` or `collectedData.primaryColor` / `backgroundColor` depending on mode).
- **PDF path:** New code paths: (1) In `handleIncomingMessage`, when status is `choose_input_method` and user sent document (or we already chose "Upload" and we're waiting for doc), call a new handler that downloads the file, runs pdf-parse, then LLM, then prefills and sends summary. (2) New helper: `parseResumePdf(buffer): Promise<ResumeData>` using pdf-parse + Groq. (3) Translations: keys for "Upload your existing PDF" / "Build from scratch", and for the post-parse summary.

---

## Data / config

- **Conversation (Firestore):** Add fields if needed: e.g. `selectedPrimaryColor?: string`, `inputMethod?: "upload" | "scratch"`, and keep `collectedData` for prefilled data after PDF parse.
- **Resume colour config:** Either move `RESUME_COLOR_CONFIG` from servePreview into a shared module (e.g. `config/resumeColors.ts`) used by both preview and conversation, or duplicate a minimal version (mode + list of { id, label, hex }) for the WhatsApp flow. Labels needed for list rows ("Pale green", etc.).

---

## Order of implementation (suggested)

1. **Colour step after template selection**  
   Add state `selecting_color`; after list_reply (template chosen), if resume → send message "We have more background colour options" or "Single background, pick accent", then send list of colour options; on reply store hex and move to next step.

2. **"Upload PDF" vs "Build from scratch"**  
   Add step (state or phase) that sends two options (buttons or list); set `inputMethod`; if scratch → go to refining (current flow); if upload → go to "waiting_for_pdf" (or same state with a flag).

3. **PDF parsing pipeline**  
   On document message when waiting for PDF: download → pdf-parse → text → LLM (schema prompt) → parse JSON → validate/prefill `collectedData` → send summary → enter refining.

4. **Fulfillment**  
   When generating preview/final, pass `selectedPrimaryColor` (or `backgroundColor` for bg-mode) from conversation into the PDF generator so the chosen colour is applied. (Already have primaryColor/backgroundColor in template code; ensure it's read from conversation.)

5. **Copy and limits**  
   Add all new strings to `translations.json`; keep "Upload your existing PDF" / "Build from scratch" and colour/list messages within WhatsApp length.

---

## Open questions

1. **9 vs 10 templates**  
   You said "select out of 9 templates we choose out of 13". Catalog has 10 resume use cases; preview has more (e.g. 13 with ats, solstice, astral). Do you want to **show 9** in the list (and if so, which 9), or keep showing all 10 from the current catalog?

2. **Colour list labels**  
   For bg-mode we have hex codes; for WhatsApp we need short labels (e.g. "Pale green", "Pink", "Mint"). Should we define one label per colour per template in config, or use a generic mapping (e.g. first = "Option 1", second = "Option 2")?

3. **Summary after PDF parse**  
   How short should the "data we understood" message be? One message with name, role, and "3 jobs, 2 schools, 8 skills" style, or can we send 2 messages (e.g. first: name + role, second: sections summary) to stay under limits?

4. **Edit after PDF (add/remove/replace)**  
   You said "LLM has to do it smart". Confirming: we keep the existing refining behaviour (user says "change summary to X" or "add a job at Company Y" → LLM extracts fields and we merge into collectedData), and the only new part is the **initial** prefill from PDF. No new edit logic except ensuring the prompt handles "add/remove/replace" well. Correct?

5. **Where to run pdf-parse**  
   pdf-parse is pure JS (no native deps). Run it inside the same Firebase Function that handles the webhook (after downloading the document). If the PDF is large or we add OCR later, we might need a separate callable or queue; for now in-process is fine.

---

## Summary

- **Flow:** Resume → one image + list of 9 (or 10) templates → user picks template → we tell them bg vs text and list colours → user picks colour → we ask "Upload PDF" or "Build from scratch" → either refine from scratch or wait for PDF, parse (pdf-parse + LLM), prefill, then refine → confirm → preview (watermark) → pay → final.
- **New pieces:** Colour selection step (state + config with labels), "Upload vs scratch" step, PDF download + parse + LLM + prefill, and wiring `selectedPrimaryColor`/backgroundColor into generation.
- **Reuse:** Existing refining/confirmation/fulfillment/payment; existing LLM extraction for edits; existing template colour logic (bg vs text) from preview config.
