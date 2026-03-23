import { logger } from "firebase-functions";
import { db } from "utils/firestore";
import { ParsedMessage } from "services/whatsapp/parseWebhookPayload";
import { sendText } from "services/whatsapp/sendText";
import { downloadWhatsAppMedia } from "services/whatsapp/getMedia";
import { uploadFile } from "services/storage/uploadFile";
import { findUseCase } from "config/catalog";
import { callOpenAI } from "services/llm/openai";
import { getProductConfig, UseCase } from "config/products";
import { ProductField } from "config/products/types";
import { Conversation, HistoryEntry } from "services/conversation/handleIncomingMessage";
import { sendConfirmation } from "services/conversation/confirmation";
import { t } from "utils/t";
import { templateKeyFromUseCaseId } from "config/resumeColors";
import { resumeTemplates } from "services/documents/templateRegistry";

const MAX_HISTORY_PAIRS = 10;

function trimHistory(history: HistoryEntry[]): HistoryEntry[] {
  return history.slice(-(MAX_HISTORY_PAIRS * 2));
}

async function onFormComplete(phone: string, conversation: Conversation): Promise<void> {
  if (conversation.suppressAutoConfirmation) {
    return;
  }
  if (conversation.useCase === "resume") {
    const { advanceResumeFlow } = await import("services/conversation/resumeFlowRouter");
    await advanceResumeFlow(phone, conversation);
  } else {
    await sendConfirmation(phone, conversation);
  }
}

export async function flowEngine(
  phone: string,
  message: ParsedMessage,
  conversation: Conversation
): Promise<void> {
  const config = getProductConfig(conversation.useCase as UseCase);
  let collectedData = { ...conversation.collectedData };

  // Resume: user sent a photo for a photo-capable template — download, upload to Storage, set photoUrl
  if (message.type === "image" && message.mediaId && conversation.useCase === "resume") {
    const ucId = conversation.selectedUseCaseIds?.[0];
    const uc = ucId ? findUseCase(ucId) : null;
    if (uc?.supportsPhoto) {
      try {
        const { buffer, mimeType } = await downloadWhatsAppMedia(message.mediaId);
        const cid = conversation.conversationId;
        const fileName = `resume-photo-${cid}-${Date.now()}`;
        const photoUrl = await uploadFile(buffer, mimeType, "resume-photos", fileName);
        collectedData.photoUrl = photoUrl;
        await db.collection("conversations").doc(cid).update({
          "collectedData.photoUrl": photoUrl,
          updatedAt: new Date(),
        });
        await sendText(cid, phone, t("resume.photo.received"));
      } catch (err) {
        logger.warn("Resume photo download/upload failed", { err });
        await sendText(conversation.conversationId, phone, t("errors.generic"));
      }
      if (isComplete(config.fields, collectedData)) {
        await onFormComplete(phone, { ...conversation, collectedData });
      }
      return;
    }
  }

  // Handle media uploads directly — no LLM needed
  if (message.type === "image" && message.mediaId) {
    const mediaField = config.fields.find((f) => f.type === "media");
    if (mediaField) {
      const existing = (collectedData[mediaField.key] as string[] | undefined) ?? [];
      const updated = [...existing, message.mediaId];
      collectedData[mediaField.key] = updated;

      await db.collection("conversations").doc(conversation.conversationId).update({
        [`collectedData.${mediaField.key}`]: updated,
        updatedAt: new Date(),
      });

      const maxImages = 3;
      if (updated.length < maxImages) {
        await sendText(conversation.conversationId, phone, t("form.photo.progress", { current: updated.length, max: maxImages }));
      } else {
        await sendText(conversation.conversationId, phone, t("form.photo.done"));
      }
    }

    if (isComplete(config.fields, collectedData)) {
      await onFormComplete(phone, { ...conversation, collectedData });
    }
    return;
  }

  // "done" with images
  if (message.type === "text" && message.text?.toLowerCase().trim() === "done") {
    const mediaField = config.fields.find((f) => f.type === "media");
    if (mediaField) {
      const images = (collectedData[mediaField.key] as string[] | undefined) ?? [];
      if (mediaField.required && images.length === 0) {
        await sendText(conversation.conversationId, phone, t("form.photo.required"));
        return;
      }
    }
    if (isComplete(config.fields, collectedData)) {
      await onFormComplete(phone, { ...conversation, collectedData });
      return;
    }
  }

  // LLM extracts any remaining text fields from the message
  if (message.type === "text" && message.text) {
    const history = conversation.messageHistory ?? [];
    const { extractedFields, excludedSections } = await extractWithLLM(
      config.fields,
      collectedData,
      message.text,
      config.name,
      config.id,
      history,
      conversation
    );

    const firestoreUpdates: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(extractedFields)) {
      collectedData[key] = value;
      firestoreUpdates[`collectedData.${key}`] = value;
    }
    if (excludedSections?.length) {
      collectedData._excludedSections = excludedSections;
      firestoreUpdates["collectedData._excludedSections"] = excludedSections;
    }
    // Resume: derive fullName from firstName + lastName for templates
    if (config.id === "resume" && collectedData.firstName != null && collectedData.lastName != null) {
      collectedData.fullName = [String(collectedData.firstName), String(collectedData.lastName)].join(" ").trim();
      firestoreUpdates["collectedData.fullName"] = collectedData.fullName;
    }

    const alreadyComplete = isComplete(config.fields, conversation.collectedData);
    const nothingExtracted = Object.keys(extractedFields).length === 0 && !excludedSections?.length;
    if (alreadyComplete && nothingExtracted) {
      // Only show "edit not understood" if user explicitly asked for an edit
      const hasEditIntent = /change|edit|update|modify|remove|delete|add|fix|correct|replace|rewrite|reword/i.test(
        message.text
      );
      if (hasEditIntent) {
        await sendText(conversation.conversationId, phone, t("confirm.editNotUnderstood"));
      } else {
        // User is confirming or chatting — nudge them to confirm
        await sendConfirmation(phone, { ...conversation, collectedData });
      }
      return;
    }

    if (isComplete(config.fields, collectedData)) {
      if (Object.keys(firestoreUpdates).length > 0) {
        await db.collection("conversations").doc(conversation.conversationId).update({
          ...firestoreUpdates,
          updatedAt: new Date(),
        });
      }
      await onFormComplete(phone, { ...conversation, collectedData });
      return;
    }

    // In review/edit mode, don't ask for missing fields — user is focused on editing. Ask when they type "done".
    const question = conversation.suppressAutoConfirmation
      ? null
      : buildFollowUpQuestion(config.fields, collectedData);

    const newHistory = trimHistory([
      ...history,
      { role: "user" as const, content: message.text },
      ...(question ? [{ role: "assistant" as const, content: question }] : []),
    ]);

    await db.collection("conversations").doc(conversation.conversationId).update({
      ...firestoreUpdates,
      messageHistory: newHistory,
      updatedAt: new Date(),
    });

    if (question) {
      await sendText(conversation.conversationId, phone, question);
    }
    return;
  }

  // Fallback — first time entering refining: send the open invitation
  const isFirstEntry = !conversation.messageHistory || conversation.messageHistory.length === 0;
  if (isFirstEntry) {
    const openingPrompt = config.openingPrompt;
    const newHistory: HistoryEntry[] = [{ role: "assistant", content: openingPrompt }];
    await db.collection("conversations").doc(conversation.conversationId).update({
      messageHistory: newHistory,
      updatedAt: new Date(),
    });
    await sendText(conversation.conversationId, phone, openingPrompt);
  }
}

function isComplete(fields: ProductField[], data: Record<string, unknown>): boolean {
  return fields.every((f) => {
    if (!f.required) return true;
    if (f.type === "media") {
      const arr = data[f.key] as string[] | undefined;
      return Array.isArray(arr) && arr.length > 0;
    }
    return !!data[f.key];
  });
}

function buildFollowUpQuestion(fields: ProductField[], data: Record<string, unknown>): string | null {
  const missingText = fields.filter((f) => f.type === "text" && f.required && !data[f.key]);
  if (missingText.length === 1) return t("form.followup.single", { field: missingText[0].label });
  if (missingText.length > 1) return t("form.followup.many", { fields: missingText.map((f) => f.label).join(", ") });

  const requiredMedia = fields.find((f) => f.type === "media" && f.required);
  if (requiredMedia) {
    const arr = data[requiredMedia.key] as string[] | undefined;
    if (!Array.isArray(arr) || arr.length === 0) return t("form.photo.request");
  }

  return null;
}

/** Resume data schema — canonical structure the LLM must follow. */
const RESUME_SCHEMA = `
## Resume data schema (structure only — do NOT use as example values)

- firstName: string (given name — if user provides a full name, split it: first word(s) = firstName, last word(s) = lastName)
- lastName: string (family/surname — MUST be extracted if any name is provided; never leave empty when firstName is set)
- targetRole: string (job title the user is targeting — if not explicit, infer from Career Objective, Summary, or professional headline, e.g. "AI ML Engineer")
- summary: string (optional — map Career Objective, Profile Summary, or About Me to this field)
- education: array of { degree, school, startYear?, endYear, location?, details? } (optional)
- skills: array of strings (optional)
- experience: array of { title, company, startDate, endDate?, location?, bullets: string[], url? } (optional). Order: most recent first.
- projects: array of { name, description?, bullets: string[], url? } (optional). Order: most recent/important first.
- volunteer: array of { role, organization, startDate?, endDate?, bullets?: string[] } (optional)
- certifications: array of { name, issuer?, date?, url? } (optional)
- awards: array of { title, issuer?, date?, description? } (optional)
- languages: array of { language, proficiency? } (optional)
- interests: array of strings (optional)
- organizations: array of { name, role?, startDate?, endDate? } (optional)
- achievements: array of { title, description?, url? } (optional)
- conferences: array of { name, role?, date?, url? } (optional)
- causes: array of strings (optional)
- email, phone, address, linkedin, github, website: string (optional)
- primaryColor: string hex e.g. #1a2744 (optional)
`;

/** Build indexed view of ALL array sections for targeted edits. */
function buildResumeIndexedData(collectedData: Record<string, unknown>): string {
  const lines: string[] = [];

  // Experience
  const exp = collectedData.experience as Array<{ title?: string; company?: string; bullets?: string[] }> | undefined;
  if (Array.isArray(exp) && exp.length > 0) {
    lines.push("### Experience (indexed):");
    exp.forEach((job, i) => {
      lines.push(`  Experience ${i}: ${job.title ?? ""} at ${job.company ?? ""}`);
      (job.bullets ?? []).forEach((b, j) => {
        lines.push(`    Bullet ${j}: "${String(b).replace(/"/g, '\\"')}"`);
      });
    });
    lines.push("");
  }

  // Projects
  const proj = collectedData.projects as Array<{ name?: string; bullets?: string[] }> | undefined;
  if (Array.isArray(proj) && proj.length > 0) {
    lines.push("### Projects (indexed):");
    proj.forEach((p, i) => {
      lines.push(`  Project ${i}: ${p.name ?? ""}`);
      (p.bullets ?? []).forEach((b, j) => {
        lines.push(`    Bullet ${j}: "${String(b).replace(/"/g, '\\"')}"`);
      });
    });
    lines.push("");
  }

  // Education
  const edu = collectedData.education as Array<{ degree?: string; school?: string }> | undefined;
  if (Array.isArray(edu) && edu.length > 0) {
    lines.push("### Education (indexed):");
    edu.forEach((e, i) => lines.push(`  Education ${i}: ${e.degree ?? ""} at ${e.school ?? ""}`));
    lines.push("");
  }

  // Certifications
  const certs = collectedData.certifications as Array<{ name?: string }> | undefined;
  if (Array.isArray(certs) && certs.length > 0) {
    lines.push("### Certifications (indexed):");
    certs.forEach((c, i) => lines.push(`  Certification ${i}: ${c.name ?? ""}`));
    lines.push("");
  }

  // Achievements
  const achs = collectedData.achievements as Array<{ title?: string }> | undefined;
  if (Array.isArray(achs) && achs.length > 0) {
    lines.push("### Achievements (indexed):");
    achs.forEach((a, i) => lines.push(`  Achievement ${i}: "${String(a.title ?? "").replace(/"/g, '\\"')}"`));
    lines.push("");
  }

  // Volunteer
  const vol = collectedData.volunteer as Array<{ role?: string; organization?: string }> | undefined;
  if (Array.isArray(vol) && vol.length > 0) {
    lines.push("### Volunteer (indexed):");
    vol.forEach((v, i) => lines.push(`  Volunteer ${i}: ${v.role ?? ""} at ${v.organization ?? ""}`));
    lines.push("");
  }

  // Awards
  const awards = collectedData.awards as Array<{ title?: string }> | undefined;
  if (Array.isArray(awards) && awards.length > 0) {
    lines.push("### Awards (indexed):");
    awards.forEach((a, i) => lines.push(`  Award ${i}: ${a.title ?? ""}`));
    lines.push("");
  }

  // Organizations
  const orgs = collectedData.organizations as Array<{ name?: string }> | undefined;
  if (Array.isArray(orgs) && orgs.length > 0) {
    lines.push("### Organizations (indexed):");
    orgs.forEach((o, i) => lines.push(`  Organization ${i}: ${o.name ?? ""}`));
    lines.push("");
  }

  // Conferences
  const confs = collectedData.conferences as Array<{ name?: string }> | undefined;
  if (Array.isArray(confs) && confs.length > 0) {
    lines.push("### Conferences (indexed):");
    confs.forEach((c, i) => lines.push(`  Conference ${i}: ${c.name ?? ""}`));
    lines.push("");
  }

  return lines.join("\n");
}

/** Build user journey context for the LLM. */
function buildUserJourney(conversation: Conversation, productId: string): string {
  const lines: string[] = [
    `Current status: ${conversation.status}`,
    `Product: ${conversation.useCase ?? productId}`,
    `Input method: ${conversation.inputMethod ?? "—"}`,
  ];
  if (conversation.browsePath?.length) {
    lines.push(`Browse path: ${conversation.browsePath.join(" → ")}`);
  }
  if (productId === "resume" && conversation.selectedUseCaseIds?.[0]) {
    const ucId = conversation.selectedUseCaseIds[0];
    const templateKey = templateKeyFromUseCaseId(ucId);
    const meta = resumeTemplates[templateKey];
    if (meta) {
      lines.push(`Selected template: ${meta.label} — ${meta.description}`);
    }
  }
  if (conversation.messageHistory?.length) {
    lines.push(`Conversation turns: ${conversation.messageHistory.length}`);
  }
  return lines.join("\n");
}

async function extractWithLLM(
  fields: ProductField[],
  collectedData: Record<string, unknown>,
  userMessage: string,
  productName: string,
  productId: string,
  history: HistoryEntry[],
  conversation: Conversation
): Promise<{ extractedFields: Record<string, unknown>; excludedSections?: string[] }> {
  const isResume = productId === "resume";

  // Schema block — canonical structure
  const schemaBlock = isResume ? RESUME_SCHEMA : fields
    .filter((f) => f.type === "text" && f.key !== "primaryColor")
    .map((f) => {
      const schemaHint = f.schema ? ` [schema: ${f.schema}]` : "";
      return `- ${f.key} (${f.label})${schemaHint}`;
    })
    .join("\n");

  // Full user data — the complete JSON at this moment (source of truth)
  const userDataJson = JSON.stringify(collectedData, null, 2);
  const indexedBlock = isResume ? buildResumeIndexedData(collectedData) : "";

  const hasSubstantialData =
    isResume &&
    ((Array.isArray(collectedData.experience) && collectedData.experience.length > 0) ||
      (Array.isArray(collectedData.projects) && collectedData.projects.length > 0) ||
      !!(collectedData.firstName && collectedData.lastName && collectedData.targetRole));

  const resumeInstructions = isResume
    ? `
${hasSubstantialData ? `## CRITICAL — Default to NO CHANGE (user has existing data)

- ONLY output extractedFields when the user EXPLICITLY asks to change, add, remove, update, or fix something.
- If the user is asking a question, confirming, or just chatting → return { "extractedFields": {} }.
- If in doubt → return { "extractedFields": {} }. Prefer no change over guessing.
` : `## Initial data collection — extract what the user provides

- Extract field values from the user's message. Use conversation history to infer which field an ambiguous reply answers.
`}

## ZERO SIDE-EFFECTS RULE (most important)

- Each edit instruction affects ONLY the field(s) it explicitly mentions. Do NOT touch any other field.
- "update X to Y" means change ONLY that text. Every other item in every other array/field stays VERBATIM — copy from userData unchanged.
- If the user sends multiple instructions (numbered list), process ALL of them — but each instruction only affects its own target field.
- NEVER silently remove, add, or modify items the user did not mention. If the user says "change 4+ to 5+" in achievements, ONLY that text changes — no items are added or removed anywhere.

## Anti-hallucination rules

- NEVER invent companies, roles, projects, or bullets. Only use data the user provided or the existing userData above.
- Treat userData as the ONLY source of truth. Copy verbatim from it when doing partial edits.
- When adding a new experience or project: always generate at least 2 professional bullet points based on what the user described, even if they only gave a brief description.

## Removal rules

- "remove the last X" → remove the item with the HIGHEST index in that array (use the indexed view). Return the complete array minus that one item.
- "remove the first X" → remove index 0. Return the complete array minus that one item.
- "remove any N items" or "remove N items" → remove exactly N items (pick the least impressive/relevant ones). Return the remaining items.
- "remove X" (specific item) → remove ONLY that one item. Return the complete array minus it. Do NOT remove or modify anything else.
- A removal returns ONLY the affected array field. Do NOT touch other fields.

## Add-to-item vs add-new-item

- "add X to/in [existing item]" or "add X after Y in [item]" → MODIFY that existing item's text/description to include X. Do NOT create a new separate item.
  Example: "add Bullockcart after AWS in the first achievement" → find Achievement 0, modify its title to include "Bullockcart" after "AWS". Do NOT create a new Achievement.
- "add a new X" or "add X" (without referencing an existing item) → create a new item in the array.

## Partial edits (targeted updates)

- Use the indexed view to map ALL user references — experience, projects, achievements, certifications, volunteer, education, awards, organizations, conferences.
- "the last X" → highest index in that array.
- "the first X" → index 0.
- For ANY change to an array field — whether adding, editing, or removing — ALWAYS return the COMPLETE array. Copy unchanged items VERBATIM from userData. Only the specific item(s) the user mentioned should differ.
- When rewriting a bullet to be "more robust" or "AI-powered": keep the SAME underlying work, tech, and impact — only improve wording. Do NOT invent different work.

## Multi-instruction handling

- When user sends a numbered list (1. ... 2. ... 3. ...) or multiple requests in one message, process EVERY instruction. Do not skip any.
- Each instruction is independent — apply ALL of them to produce the final result.
- If instruction 1 says "remove X" and instruction 2 says "add Y", both must be reflected in the output.

## Rewrite / reframe requests (EXCEPTION to anti-hallucination)

- If the user asks to "rewrite", "reframe", "improve", "make it better", "make it professional", "use AI", or "with AI" for a field:
  - You MUST make SUBSTANTIAL changes — rewrite descriptions, bullets, and wording thoroughly. Do NOT just add a word like "AI-powered" in front.
  - Rewrite every bullet: use stronger action verbs, quantify impact where possible, highlight technologies and outcomes.
  - Rewrite descriptions: make them professional, concise, and impactful.
  - If summary is missing or empty, GENERATE a professional 2-3 sentence summary based on the user's existing data (targetRole, experience, skills, projects).
  - Base rewrites on the user's EXISTING data (companies, dates, tech stack) — do NOT invent new facts.
  - Only rewrite the field(s) the user mentioned. Copy all other fields VERBATIM.
  - If the user says "reframe everything", "reframe the whole thing", "rewrite all", or doesn't specify a field → rewrite ALL text-heavy fields: summary, experience bullets, project descriptions and bullets. Keep factual data (names, dates, companies, skills) unchanged.
  - Example: "reframe projects with AI" → rewrite ALL project descriptions and ALL bullets with professional, impactful language. Not just a prefix change.

## Ordering

- Experience: always order most recent first (reverse chronological) unless the user explicitly asks for a different order.
- Projects: order by most recent or most important first unless the user specifies otherwise.

## Formatting

- Job title: put only the role in "title", company in "company" separately. Never put "at Company" inside title.
- Links: store the FULL URL. linkedin.com URLs → store in "linkedin" field; github.com URLs → store in "github" field; other personal sites → store in "website" field. Always normalize to https://.
- Bullets: full sentences (10+ words). Do NOT shorten unless user explicitly asks.
- Every experience and project MUST have at least 2 bullet points. If the user gives a brief description, generate 2 professional bullets based on what they said.`
    : "";

  const userJourney = buildUserJourney(conversation, productId);

  const system = `You are collecting information to create ${productName} content on WhatsApp.
The user may write in English, Hindi, Hinglish, or other languages. Extract information from their message regardless of language.

## User journey (where they are in the flow)
${userJourney}

## Schema (structure)
${schemaBlock}

## User's current data (source of truth — do not invent)
${userDataJson}
${indexedBlock ? `\n## Indexed view (for targeted edits like "remove bullet X", "change first bullet at Google")\n${indexedBlock}` : ""}

${isResume ? resumeInstructions : ""}

${!isResume ? `Based on the conversation history and the latest user message, extract any field values that match the schema above. Use the conversation history to infer which field an ambiguous reply is answering.` : ""}

Respond ONLY in JSON: { "extractedFields": { "fieldKey": value }, "excludedSections": ["fieldKey"] (optional, only if user asks to skip/remove a section) }
If nothing should be changed, respond with: { "extractedFields": {} }`;

  let raw = "";
  try {
    raw = await callOpenAI(system, userMessage, true, history);
    const result = JSON.parse(raw) as { extractedFields?: Record<string, unknown>; excludedSections?: string[] };
    const extractedFields = result.extractedFields ?? {};
    const excludedSections = result.excludedSections;

    return { extractedFields, excludedSections };
  } catch (err) {
    logger.warn("LLM extraction failed", { err, rawResponse: raw.slice(0, 1000), userMessage: userMessage.slice(0, 200) });
    return { extractedFields: {} };
  }
}
