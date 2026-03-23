/**
 * Parse a resume PDF buffer: extract text with pdf-parse, then map to our schema via LLM.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text?: string }>;
import JSON5 from "json5";
import { logger } from "firebase-functions";
import { callOpenAI } from "services/llm/openai";
import { parseResumeData, type ResumeData } from "services/documents/templates/resume/helpers";

const RESUME_SCHEMA_PROMPT = `You are extracting structured resume data from raw text. Output ONLY valid JSON with these exact keys (use null or omit for missing):
- fullName (string)
- targetRole (string)
- summary (string, optional)
- email, phone, address, linkedin, github, website (strings, optional)
- experience: array of { title, company, location?, startDate, endDate?, bullets: string[], url? }
- education: array of { degree, school, location?, startYear?, endYear, details? }
- skills: array of strings
- projects: array of { name, description?, bullets?: string[], url? }
- volunteer: array of { role, organization, startDate?, endDate?, bullets?: string[] } (optional). Map sections named "Extracurricular Activities", "Co-curricular Activities", "Activities", or similar to this field. Preserve the structure as written in the resume — if the resume lists distinct roles with different organizations, keep them as separate entries. If activities are grouped together under one heading, keep them grouped.
- certifications: array of { name, issuer?, date?, url? } (optional)
- awards: array of { title, issuer?, date?, description? } (optional)
- languages: array of { language, proficiency? } (optional)
- interests: array of strings (optional)
- organizations: array of { name, role?, startDate?, endDate? } (optional)
- achievements: array of { title, description?, url? } (optional)
- conferences: array of { name, role?, date?, url? } (optional)
- causes: array of strings (optional)
Normalize dates (e.g. "Present" for current).
If the text includes labels like "LinkedIn:" or "GitHub:" or "Website:", capture the URL or handle that follows, even if it does not start with https://.
Extract all URLs you can find and map them appropriately to linkedin, github, website, or to the url field of the relevant experience/project.
CRITICAL: Return ONLY the raw JSON object. No markdown, no code blocks, no explanation, no thinking. Use double quotes for all keys and strings. No trailing commas. Escape any double quotes inside strings with backslash (e.g. "He said \\"hi\\"").`;

/**
 * Extract and sanitize JSON from LLM response. Handles markdown, reasoning blocks, trailing commas.
 */
function extractJsonFromResponse(raw: string): string {
  let s = raw.trim();
  // Strip markdown code fence
  s = s.replace(/^[\s\S]*?```(?:json)?\s*/, "").replace(/\s*```[\s\S]*$/, "").trim();
  // If there's text before the first {, take from first { to matching }
  const firstBrace = s.indexOf("{");
  if (firstBrace >= 0) {
    let depth = 0;
    let end = -1;
    let inString = false;
    let escape = false;
    let quote = "";
    for (let i = firstBrace; i < s.length; i++) {
      const c = s[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\" && inString) {
        escape = true;
        continue;
      }
      if (!inString) {
        if (c === '"' || c === "'") {
          inString = true;
          quote = c;
          continue;
        }
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      } else if (c === quote) {
        inString = false;
      }
    }
    if (end >= 0) s = s.slice(firstBrace, end + 1);
  }
  // Remove trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, "$1");
  // Fix single-quoted keys: 'key': -> "key":
  s = s.replace(/'([^']*)'\s*:/g, '"$1":');
  return s.trim();
}

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
  const jsonStr = extractJsonFromResponse(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    try {
      parsed = JSON5.parse(jsonStr);
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      logger.warn("Resume PDF: LLM JSON parse failed", { raw: raw.slice(0, 500), jsonStr: jsonStr.slice(0, 500) });
      throw new Error(`LLM did not return valid JSON: ${msg}`);
    }
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
    volunteer: data.volunteer,
    certifications: data.certifications,
    awards: data.awards,
    languages: data.languages,
    interests: data.interests,
    organizations: data.organizations,
    achievements: data.achievements,
    conferences: data.conferences,
    causes: data.causes,
    email: data.email,
    phone: data.phone,
    address: data.address,
    linkedin: data.linkedin,
    github: data.github,
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
function isJob(o: unknown): o is {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets?: string[];
  url?: string;
} {
  return typeof o === "object" && o !== null;
}
/** Education shape from collectedData.education[]. */
function isEdu(o: unknown): o is { degree?: string; school?: string; location?: string; startYear?: string; endYear?: string; details?: string } {
  return typeof o === "object" && o !== null;
}
/** Project shape from collectedData.projects[]. */
function isProj(o: unknown): o is { name?: string; description?: string; bullets?: string[]; url?: string } {
  return typeof o === "object" && o !== null;
}

/**
 * Build the "profile / everything else" section:
 * name, role, summary, contact, education, skills (no experience/projects).
 */
export function formatResumeSummaryProfile(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || (data.fullName as string) || "";
  const role = (data.targetRole as string) || "";
  if (name) lines.push(`*Name:* ${name}`);
  if (role) lines.push(`*Role:* ${role}`);
  lines.push("");

  const summary = data.summary;
  lines.push("*Summary*");
  if (summary && String(summary).trim()) {
    lines.push(String(summary).trim());
  } else {
    lines.push("-/-");
  }
  lines.push("");

  const contact: string[] = [];
  if (data.email) contact.push(`Email: ${data.email}`);
  if (data.phone) contact.push(`Phone: ${data.phone}`);
  if (data.address) contact.push(`Address: ${data.address}`);
  if (data.linkedin) contact.push(`LinkedIn: ${data.linkedin}`);
  if (data.github) contact.push(`GitHub: ${data.github}`);
  if (data.website) contact.push(`Website: ${data.website}`);
  lines.push("*Contact*");
  if (contact.length) {
    lines.push(contact.join("\n"));
  } else {
    lines.push("-/-");
  }
  lines.push("");

  const education = Array.isArray(data.education) ? data.education : [];
  lines.push("*Education*");
  if (education.length) {
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
  } else {
    lines.push("-/-");
  }
  lines.push("");

  const skills = Array.isArray(data.skills) ? data.skills : [];
  lines.push("*Skills*");
  if (skills.length) {
    const str = skills.map((s) => (s != null ? String(s).trim() : "")).filter(Boolean).join(", ");
    lines.push(str || "-/-");
  } else {
    lines.push("-/-");
  }

  return lines.join("\n").trim();
}

/**
 * Build the Experience-only section with details and links.
 */
export function formatResumeSummaryExperience(data: Record<string, unknown>): string {
  const lines: string[] = [];

  const experience = Array.isArray(data.experience) ? data.experience : [];
  lines.push("*Experience*");
  if (!experience.length) return lines.join("\n").trim() + "\n-/-";

  // Group entries by company name (case-insensitive)
  const groups: Map<string, Array<{ title: string; company: string; startDate?: string; endDate?: string; location?: string; bullets: string[]; url?: string }>> = new Map();
  const groupOrder: string[] = [];

  for (const e of experience) {
    if (!isJob(e)) continue;
    const companyKey = (e.company || "—").trim().toLowerCase();
    if (!groups.has(companyKey)) {
      groups.set(companyKey, []);
      groupOrder.push(companyKey);
    }
    groups.get(companyKey)!.push({
      title: e.title || "—",
      company: e.company || "—",
      startDate: e.startDate,
      endDate: e.endDate,
      location: e.location,
      bullets: Array.isArray(e.bullets) ? e.bullets : [],
      url: e.url,
    });
  }

  for (const key of groupOrder) {
    const roles = groups.get(key)!;
    const company = roles[0].company;
    const loc = roles[0].location ? ` (${roles[0].location})` : "";

    if (roles.length === 1) {
      // Single role — show normally
      const r = roles[0];
      const dates = [r.startDate, r.endDate].filter(Boolean).join(" – ") || "";
      const head = dates ? `${r.title} at ${company}${loc} — ${dates}` : `${r.title} at ${company}${loc}`;
      lines.push(`• ${head}`);
      for (const b of r.bullets) if (b && String(b).trim()) lines.push(`  - ${String(b).trim()}`);
      if (r.url && String(r.url).trim()) lines.push(`  Link: ${String(r.url).trim()}`);
    } else {
      // Multiple roles — group under company
      const allDates = roles.flatMap((r) => [r.startDate, r.endDate]).filter(Boolean) as string[];
      const overallRange = allDates.length ? `${allDates[allDates.length - 1]} – ${allDates[0] || "Present"}` : "";
      lines.push(`• *${company}*${loc}${overallRange ? ` — ${overallRange}` : ""}`);
      for (const r of roles) {
        const dates = [r.startDate, r.endDate].filter(Boolean).join(" – ") || "";
        lines.push(`  *${r.title}*${dates ? ` — ${dates}` : ""}`);
        for (const b of r.bullets) if (b && String(b).trim()) lines.push(`    - ${String(b).trim()}`);
        if (r.url && String(r.url).trim()) lines.push(`    Link: ${String(r.url).trim()}`);
      }
    }
  }

  return lines.join("\n").trim();
}

/**
 * Build a summary of all optional sections (volunteer, certifications, awards, etc.).
 * Only includes sections that have data. Returns empty string if none present.
 */
export function formatResumeSummaryOptional(data: Record<string, unknown>): string {
  const lines: string[] = [];

  const volunteer = Array.isArray(data.volunteer) ? data.volunteer : [];
  lines.push("*Volunteer*");
  if (volunteer.length) {
    for (const v of volunteer) {
      if (typeof v !== "object" || !v) continue;
      const o = v as Record<string, unknown>;
      const role = o.role || "—";
      const org = o.organization || "";
      const dates = [o.startDate, o.endDate].filter(Boolean).join(" – ");
      lines.push(`• ${role}${org ? ` at ${org}` : ""}${dates ? ` — ${dates}` : ""}`);
      const bullets = Array.isArray(o.bullets) ? o.bullets : [];
      for (const b of bullets) if (b && String(b).trim()) lines.push(`  - ${String(b).trim()}`);
    }
  } else {
    lines.push("-/-");
  }
  lines.push("");

  const certs = Array.isArray(data.certifications) ? data.certifications : [];
  lines.push("*Certifications*");
  if (certs.length) {
    for (const c of certs) {
      if (typeof c !== "object" || !c) continue;
      const o = c as Record<string, unknown>;
      const meta = [o.issuer, o.date].filter(Boolean).join(" — ");
      lines.push(`• ${o.name || "—"}${meta ? ` — ${meta}` : ""}`);
      if (o.url) lines.push(`  Link: ${String(o.url).trim()}`);
    }
  } else {
    lines.push("-/-");
  }
  lines.push("");

  const awards = Array.isArray(data.awards) ? data.awards : [];
  lines.push("*Awards*");
  if (awards.length) {
    for (const a of awards) {
      if (typeof a !== "object" || !a) continue;
      const o = a as Record<string, unknown>;
      const meta = [o.issuer, o.date].filter(Boolean).join(" — ");
      lines.push(`• ${o.title || "—"}${meta ? ` — ${meta}` : ""}`);
      if (o.description) lines.push(`  ${String(o.description).trim()}`);
    }
  } else {
    lines.push("-/-");
  }
  lines.push("");

  const languages = Array.isArray(data.languages) ? data.languages : [];
  lines.push("*Languages*");
  if (languages.length) {
    const items = languages.map((l) => {
      if (typeof l !== "object" || !l) return "";
      const o = l as Record<string, unknown>;
      return o.proficiency ? `${o.language} (${o.proficiency})` : String(o.language || "");
    }).filter(Boolean);
    lines.push(items.join(", "));
  } else {
    lines.push("-/-");
  }
  lines.push("");

  const interests = Array.isArray(data.interests) ? data.interests : [];
  lines.push("*Interests*");
  if (interests.length) {
    lines.push(interests.map(String).filter(Boolean).join(", "));
  } else {
    lines.push("-/-");
  }
  lines.push("");

  const orgs = Array.isArray(data.organizations) ? data.organizations : [];
  lines.push("*Organizations*");
  if (orgs.length) {
    for (const o of orgs) {
      if (typeof o !== "object" || !o) continue;
      const obj = o as Record<string, unknown>;
      const label = obj.role ? `${obj.role} — ${obj.name}` : String(obj.name || "—");
      const dates = [obj.startDate, obj.endDate].filter(Boolean).join(" – ");
      lines.push(`• ${label}${dates ? ` — ${dates}` : ""}`);
    }
  } else {
    lines.push("-/-");
  }
  lines.push("");

  const achievements = Array.isArray(data.achievements) ? data.achievements : [];
  lines.push("*Achievements*");
  if (achievements.length) {
    for (const a of achievements) {
      if (typeof a !== "object" || !a) continue;
      const o = a as Record<string, unknown>;
      lines.push(`• ${o.title || "—"}`);
      if (o.description) lines.push(`  ${String(o.description).trim()}`);
      if (o.url) lines.push(`  ${String(o.url).trim()}`);
    }
  } else {
    lines.push("-/-");
  }
  lines.push("");

  const conferences = Array.isArray(data.conferences) ? data.conferences : [];
  lines.push("*Conferences*");
  if (conferences.length) {
    for (const c of conferences) {
      if (typeof c !== "object" || !c) continue;
      const o = c as Record<string, unknown>;
      const label = o.role ? `${o.name} — ${o.role}` : String(o.name || "—");
      lines.push(`• ${label}${o.date ? ` — ${o.date}` : ""}`);
      if (o.url) lines.push(`  Link: ${String(o.url).trim()}`);
    }
  } else {
    lines.push("-/-");
  }

  return lines.join("\n").trim();
}

/**
 * Build the Projects-only section with details and links.
 */
export function formatResumeSummaryProjects(data: Record<string, unknown>): string {
  const lines: string[] = [];

  const projects = Array.isArray(data.projects) ? data.projects : [];
  lines.push("*Projects*");
  if (projects.length) {
    for (const p of projects) {
      if (!isProj(p)) continue;
      const namePart = p.name || "—";
      lines.push(`• ${namePart}`);
      if (p.description && String(p.description).trim()) lines.push(`  ${String(p.description).trim()}`);
      const bullets = Array.isArray(p.bullets) ? p.bullets : [];
      for (const b of bullets) if (b && String(b).trim()) lines.push(`  - ${String(b).trim()}`);
      if (p.url && String(p.url).trim()) {
        lines.push(`  Link: ${String(p.url).trim()}`);
      }
    }
  } else {
    lines.push("-/-");
  }

  return lines.join("\n").trim();
}
