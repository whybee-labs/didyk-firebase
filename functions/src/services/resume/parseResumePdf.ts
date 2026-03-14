/**
 * Parse a resume PDF buffer: extract text with pdf-parse, then map to our schema via LLM.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text?: string }>;
import { callOpenAI } from "services/llm/openai";
import { parseResumeData, type ResumeData } from "services/documents/templates/resume/helpers";

const RESUME_SCHEMA_PROMPT = `You are extracting structured resume data from raw text. Output ONLY valid JSON with these exact keys (use null or omit for missing):
- fullName (string)
- targetRole (string)
- summary (string, optional)
- email, phone, address, linkedin, website (strings, optional)
- experience: array of { title, company, location?, startDate, endDate?, bullets: string[], url? }
- education: array of { degree, school, location?, startYear?, endYear, details? }
- skills: array of strings
- projects: array of { name, description?, bullets?: string[], url? }

Normalize dates (e.g. "Present" for current). Extract links. Return only the JSON object, no markdown.`;

/**
 * Extract text from PDF buffer using pdf-parse.
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data?.text?.trim() ?? "";
}

/**
 * Map raw resume text to our schema via LLM. Returns object suitable for collectedData.
 */
export async function parseResumeFromPdf(buffer: Buffer): Promise<Record<string, unknown>> {
  const text = await extractTextFromPdf(buffer);
  if (!text || text.length < 20) {
    throw new Error("PDF has too little text or could not be extracted");
  }

  const raw = await callOpenAI(RESUME_SCHEMA_PROMPT, text, true);
  // Strip markdown code fence if LLM wrapped JSON in ```json ... ```
  const jsonStr = raw.replace(/^[\s\S]*?```(?:json)?\s*/, "").replace(/\s*```[\s\S]*$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`LLM did not return valid JSON: ${msg}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM output is not an object");
  }

  const data = parseResumeData(parsed as Record<string, unknown>) as ResumeData;

  // Build collectedData: we use firstName, lastName in the form; derive from fullName if needed
  const out: Record<string, unknown> = {
    targetRole: data.targetRole || "",
    summary: data.summary,
    experience: data.experience,
    education: data.education,
    skills: data.skills,
    projects: data.projects,
    email: data.email,
    phone: data.phone,
    address: data.address,
    linkedin: data.linkedin,
    website: data.website,
  };

  const fullName = (data.fullName || "").trim();
  if (fullName) {
    out.fullName = fullName;
    const parts = fullName.split(/\s+/);
    if (parts.length >= 2) {
      out.firstName = parts[0];
      out.lastName = parts.slice(1).join(" ");
    } else {
      out.firstName = fullName;
      out.lastName = "";
    }
  }

  return out;
}

/**
 * Build a short one-line summary (e.g. for previews).
 */
export function formatResumeSummary(data: Record<string, unknown>): string {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || (data.fullName as string) || "—";
  const role = data.targetRole || "—";
  const exp = Array.isArray(data.experience) ? data.experience.length : 0;
  const edu = Array.isArray(data.education) ? data.education.length : 0;
  const skills = Array.isArray(data.skills) ? data.skills.length : 0;
  const proj = Array.isArray(data.projects) ? data.projects.length : 0;
  const parts = [`*Name:* ${name}`, `*Role:* ${role}`];
  if (exp) parts.push(`${exp} job(s)`);
  if (edu) parts.push(`${edu} education`);
  if (skills) parts.push(`${skills} skills`);
  if (proj) parts.push(`${proj} project(s)`);
  return parts.join(" · ");
}

/** Job shape from collectedData.experience[]. */
function isJob(o: unknown): o is { title?: string; company?: string; location?: string; startDate?: string; endDate?: string; bullets?: string[] } {
  return typeof o === "object" && o !== null;
}
/** Education shape from collectedData.education[]. */
function isEdu(o: unknown): o is { degree?: string; school?: string; location?: string; startYear?: string; endYear?: string; details?: string } {
  return typeof o === "object" && o !== null;
}
/** Project shape from collectedData.projects[]. */
function isProj(o: unknown): o is { name?: string; description?: string; bullets?: string[] } {
  return typeof o === "object" && o !== null;
}

/**
 * Build a full multi-section summary of all extracted resume details (for post-upload message).
 */
export function formatResumeSummaryFull(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || (data.fullName as string) || "";
  const role = (data.targetRole as string) || "";
  if (name) lines.push(`*Name:* ${name}`);
  if (role) lines.push(`*Role:* ${role}`);
  lines.push("");

  const summary = data.summary;
  if (summary && String(summary).trim()) {
    lines.push("*Summary*");
    lines.push(String(summary).trim());
    lines.push("");
  }

  const contact: string[] = [];
  if (data.email) contact.push(`Email: ${data.email}`);
  if (data.phone) contact.push(`Phone: ${data.phone}`);
  if (data.address) contact.push(`Address: ${data.address}`);
  if (data.linkedin) contact.push(`LinkedIn: ${data.linkedin}`);
  if (data.website) contact.push(`Website: ${data.website}`);
  if (contact.length) {
    lines.push("*Contact*");
    lines.push(contact.join("\n"));
    lines.push("");
  }

  const experience = Array.isArray(data.experience) ? data.experience : [];
  if (experience.length) {
    lines.push("*Experience*");
    for (const e of experience) {
      if (!isJob(e)) continue;
      const title = e.title || "—";
      const company = e.company || "—";
      const loc = e.location ? ` (${e.location})` : "";
      const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ") || "";
      const head = dates ? `${title} at ${company}${loc} — ${dates}` : `${title} at ${company}${loc}`;
      lines.push(`• ${head}`);
      const bullets = Array.isArray(e.bullets) ? e.bullets : [];
      for (const b of bullets) if (b && String(b).trim()) lines.push(`  - ${String(b).trim()}`);
    }
    lines.push("");
  }

  const education = Array.isArray(data.education) ? data.education : [];
  if (education.length) {
    lines.push("*Education*");
    for (const e of education) {
      if (!isEdu(e)) continue;
      const degree = e.degree || "—";
      const school = e.school || "—";
      const loc = e.location ? ` (${e.location})` : "";
      const years = [e.startYear, e.endYear].filter(Boolean).join("–") || e.endYear || "";
      const head = years ? `${degree}, ${school}${loc} — ${years}` : `${degree}, ${school}${loc}`;
      lines.push(`• ${head}`);
      if (e.details && String(e.details).trim()) lines.push(`  ${String(e.details).trim()}`);
    }
    lines.push("");
  }

  const skills = Array.isArray(data.skills) ? data.skills : [];
  if (skills.length) {
    const str = skills.map((s) => (s != null ? String(s).trim() : "")).filter(Boolean).join(", ");
    if (str) {
      lines.push("*Skills*");
      lines.push(str);
      lines.push("");
    }
  }

  const projects = Array.isArray(data.projects) ? data.projects : [];
  if (projects.length) {
    lines.push("*Projects*");
    for (const p of projects) {
      if (!isProj(p)) continue;
      const namePart = p.name || "—";
      lines.push(`• ${namePart}`);
      if (p.description && String(p.description).trim()) lines.push(`  ${String(p.description).trim()}`);
      const bullets = Array.isArray(p.bullets) ? p.bullets : [];
      for (const b of bullets) if (b && String(b).trim()) lines.push(`  - ${String(b).trim()}`);
    }
  }

  return lines.join("\n").trim();
}
