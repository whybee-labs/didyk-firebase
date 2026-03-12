// ── Page constants ───────────────────────────────────────────────────────────

export const PW = 595.28;
export const PH = 841.89;
export const BOTTOM = 55;

// ── Structured data types ────────────────────────────────────────────────────

export interface ResumeJob {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  bullets: string[];
  url?: string;
}

export interface ResumeEducation {
  degree: string;
  school: string;
  location?: string;
  startYear?: string;
  endYear: string;
  details?: string;
}

export interface ResumeProject {
  name: string;
  description?: string;
  bullets?: string[];
  url?: string;
}

export interface ResumeData {
  fullName: string;
  targetRole: string;
  summary?: string;
  experience?: ResumeJob[];
  education?: ResumeEducation[];
  skills?: string[];
  projects?: ResumeProject[];
  email?: string;
  phone?: string;
  address?: string;
  linkedin?: string;
  website?: string;
  /** Optional primary accent color (hex e.g. #1a2744). Used for headings, rules, accents. */
  primaryColor?: string;
}

/** Returns primaryColor if valid 6-digit hex, otherwise defaultHex. */
export function getPrimaryColor(d: ResumeData, defaultHex: string): string {
  const c = d.primaryColor;
  if (c && typeof c === "string" && /^#[0-9A-Fa-f]{6}$/.test(c.trim())) return c.trim();
  return defaultHex;
}

// ── Parse raw data (handles both structured JSON and flat strings) ───────────

export function parseResumeData(raw: Record<string, unknown>): ResumeData {
  return {
    fullName:   String(raw.fullName ?? ""),
    targetRole: String(raw.targetRole ?? ""),
    summary:    raw.summary ? String(raw.summary) : undefined,
    experience: parseExperience(raw.experience),
    education:  parseEducation(raw.education),
    skills:     parseSkills(raw.skills),
    projects:   parseProjects(raw.projects),
    email:      raw.email ? String(raw.email) : undefined,
    phone:      raw.phone ? String(raw.phone) : undefined,
    address:    raw.address ? String(raw.address) : undefined,
    linkedin:   raw.linkedin ? String(raw.linkedin) : undefined,
    website:    raw.website ? String(raw.website) : undefined,
    primaryColor: raw.primaryColor ? String(raw.primaryColor) : undefined,
  };
}

function parseExperience(val: unknown): ResumeJob[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
    return val as ResumeJob[];
  }
  const text = String(val);
  const blocks = text.split(/\n{2,}/);
  return blocks.filter(Boolean).map(block => {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    const header = lines[0] ?? "";
    const bullets = lines.slice(1).map(l => l.replace(/^[\s\-•·*]+/, "").trim()).filter(Boolean);
    const parts = header.split(/\s*[—–-]\s*/);
    return { title: parts[0] ?? header, company: parts[1] ?? "", startDate: parts[2] ?? "", bullets };
  });
}

function parseEducation(val: unknown): ResumeEducation[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
    return val as ResumeEducation[];
  }
  const text = String(val);
  const blocks = text.split(/\n{2,}/);
  return blocks.filter(Boolean).map(block => {
    const parts = block.split(/\s*[—–-]\s*/);
    return { degree: parts[1] ?? block, school: parts[0] ?? "", endYear: parts[2] ?? "" };
  });
}

function parseSkills(val: unknown): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.map(String);
  return String(val).split(/[,·•\n]/).map(s => s.trim()).filter(Boolean);
}

function parseProjects(val: unknown): ResumeProject[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
    return val as ResumeProject[];
  }
  const text = String(val);
  const blocks = text.split(/\n{2,}/);
  return blocks.filter(Boolean).map(block => {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    const header = lines[0] ?? "";
    const parts = header.split(/\s*[—–]\s*/);
    const bullets = lines.slice(1).map(l => l.replace(/^[\s\-•·*]+/, "").trim()).filter(Boolean);
    return { name: parts[0] ?? header, description: parts[1], bullets };
  });
}

// ── Low-level drawing helpers ────────────────────────────────────────────────

export const PAGE_TOP = 40;

export function pageBreak(doc: PDFKit.PDFDocument, need: number): void {
  if (doc.y + need > PH - BOTTOM) {
    doc.addPage();
    doc.y = PAGE_TOP;
  }
}

export function hr(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number,
  color = "#cccccc", lw = 0.5,
): void {
  doc.save()
    .moveTo(x, y).lineTo(x + w, y)
    .strokeColor(color).lineWidth(lw).stroke()
    .restore();
}

// ── Shared section renderers (used by polished batch-1 templates) ────────────

export function renderExperience(
  doc: PDFKit.PDFDocument,
  jobs: ResumeJob[],
  x: number, w: number,
  fonts: { title: string; body: string; meta: string; bullet: string },
  colors: { title: string; meta: string; body: string; bullet: string },
): void {
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    pageBreak(doc, 50);

    // Job title + company
    doc.font(fonts.title).fontSize(10).fillColor(colors.title)
      .text(job.title, x, doc.y, { width: w, continued: false });

    const companyLine = [job.company, job.location].filter(Boolean).join(", ");
    const dateLine = [job.startDate, job.endDate].filter(Boolean).join(" – ");

    doc.font(fonts.meta).fontSize(8.5).fillColor(colors.meta);
    if (dateLine) {
      const dateW = doc.widthOfString(dateLine);
      const companyW = w - dateW - 10;
      const metaY = doc.y + 1;
      doc.text(companyLine, x, metaY, { width: companyW });
      doc.text(dateLine, x + w - dateW, metaY, { width: dateW, align: "right" });
      doc.y = metaY + 12;
    } else {
      doc.text(companyLine, x, doc.y + 1, { width: w });
    }

    doc.y += 3;

    // Bullets
    for (const b of job.bullets) {
      pageBreak(doc, 14);
      doc.font(fonts.bullet).fontSize(8.5).fillColor(colors.bullet)
        .text(`•   ${b}`, x + 8, doc.y, { width: w - 16, lineGap: 1.5 });
      doc.y += 2;
    }

    if (job.url) {
      pageBreak(doc, 14);
      doc.font(fonts.meta).fontSize(7.5).fillColor("#2563eb")
        .text(job.url, x + 8, doc.y + 1, { width: w - 16, link: job.url, underline: true });
      doc.y += 3;
    }

    if (i < jobs.length - 1) doc.y += 10;
  }
}

export function renderEducation(
  doc: PDFKit.PDFDocument,
  entries: ResumeEducation[],
  x: number, w: number,
  fonts: { title: string; body: string; meta: string },
  colors: { title: string; meta: string; body: string },
): void {
  for (let i = 0; i < entries.length; i++) {
    const ed = entries[i];
    pageBreak(doc, 36);

    doc.font(fonts.title).fontSize(9.5).fillColor(colors.title)
      .text(ed.degree, x, doc.y, { width: w });

    const schoolLine = [ed.school, ed.location].filter(Boolean).join(", ");
    const yearLine = [ed.startYear, ed.endYear].filter(Boolean).join(" – ");

    doc.font(fonts.meta).fontSize(8.5).fillColor(colors.meta);
    if (yearLine) {
      const yearW = doc.widthOfString(yearLine);
      const schoolW = w - yearW - 10;
      const metaY = doc.y + 1;
      doc.text(schoolLine, x, metaY, { width: schoolW });
      doc.text(yearLine, x + w - yearW, metaY, { width: yearW, align: "right" });
      doc.y = metaY + 12;
    } else {
      doc.text(schoolLine, x, doc.y + 1, { width: w });
    }

    if (ed.details) {
      doc.font(fonts.body).fontSize(8).fillColor(colors.body)
        .text(ed.details, x, doc.y + 1, { width: w });
    }

    if (i < entries.length - 1) doc.y += 8;
  }
}

export function renderSkillsPills(
  doc: PDFKit.PDFDocument,
  skills: string[], x: number, startY: number, maxW: number,
  bg: string, fg = "#ffffff", radius = 9,
): number {
  let cx = x;
  let cy = startY;
  const pillH = 20;
  const padX = 10;
  const gapX = 6;
  const gapY = 6;
  for (const item of skills) {
    const tw = doc.font("Inter").fontSize(8).widthOfString(item);
    const pillW = tw + padX * 2;
    if (cx + pillW > x + maxW && cx !== x) {
      cx = x;
      cy += pillH + gapY;
    }
    if (cy + pillH + 10 > PH - BOTTOM) {
      doc.addPage();
      cy = PAGE_TOP;
      cx = x;
    }
    doc.roundedRect(cx, cy, pillW, pillH, radius).fill(bg);
    doc.font("Inter").fontSize(8).fillColor(fg)
      .text(item, cx + padX, cy + 5.5, { width: pillW - padX * 2, lineBreak: false });
    cx += pillW + gapX;
  }
  doc.y = cy + pillH + gapY;
  return cy + pillH + gapY;
}

export function renderSkillsGrid(
  doc: PDFKit.PDFDocument,
  skills: string[], x: number, w: number,
  font: string, color: string,
): void {
  const colW = w / 2 - 10;
  const half = Math.ceil(skills.length / 2);
  const startY = doc.y;
  for (let i = 0; i < half; i++) {
    doc.font(font).fontSize(8.5).fillColor(color)
      .text(`•   ${skills[i]}`, x, startY + i * 15, { width: colW });
  }
  for (let i = half; i < skills.length; i++) {
    doc.font(font).fontSize(8.5).fillColor(color)
      .text(`•   ${skills[i]}`, x + colW + 20, startY + (i - half) * 15, { width: colW });
  }
  doc.y = startY + half * 15;
}

export function renderSkillsList(
  doc: PDFKit.PDFDocument,
  skills: string[], x: number, w: number,
  font: string, color: string,
): void {
  for (const sk of skills) {
    pageBreak(doc, 14);
    doc.font(font).fontSize(8.5).fillColor(color)
      .text(`•   ${sk}`, x, doc.y, { width: w });
    doc.y += 2;
  }
}

export function renderProjects(
  doc: PDFKit.PDFDocument,
  projects: ResumeProject[],
  x: number, w: number,
  fonts: { title: string; body: string; bullet: string },
  colors: { title: string; body: string; bullet: string },
): void {
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    pageBreak(doc, 36);

    doc.font(fonts.title).fontSize(9.5).fillColor(colors.title)
      .text(p.name, x, doc.y, { width: w });

    if (p.description) {
      doc.font(fonts.body).fontSize(8.5).fillColor(colors.body)
        .text(p.description, x, doc.y + 2, { width: w, lineGap: 1.2 });
    }

    if (p.bullets) {
      doc.y += 3;
      for (const b of p.bullets) {
        pageBreak(doc, 14);
        doc.font(fonts.bullet).fontSize(8.5).fillColor(colors.bullet)
          .text(`•   ${b}`, x + 8, doc.y, { width: w - 16, lineGap: 1.5 });
        doc.y += 2;
      }
    }

    if (p.url) {
      pageBreak(doc, 14);
      doc.font(fonts.body).fontSize(7.5).fillColor("#2563eb")
        .text(p.url, x + 8, doc.y + 1, { width: w - 16, link: p.url, underline: true });
      doc.y += 3;
    }

    if (i < projects.length - 1) doc.y += 8;
  }
}

// ── Legacy helpers (used by non-polished templates that still use flat strings) ──

export function s(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) {
    return v.map(item => {
      if (typeof item === "object" && item !== null) {
        const r = item as Record<string, unknown>;
        if (r.title && r.company) {
          const header = [r.title, r.company, [r.startDate, r.endDate].filter(Boolean).join(" – ")].filter(Boolean).join(" — ");
          const bullets = Array.isArray(r.bullets) ? r.bullets.map((b: unknown) => `• ${b}`).join("\n") : "";
          return [header, bullets].filter(Boolean).join("\n");
        }
        if (r.degree && r.school) {
          return [r.degree, r.school, [r.startYear, r.endYear].filter(Boolean).join(" – "), r.details].filter(Boolean).join(" — ");
        }
        if (r.name) {
          const header = [r.name, r.description].filter(Boolean).join(" — ");
          const bullets = Array.isArray(r.bullets) ? r.bullets.map((b: unknown) => `• ${b}`).join("\n") : "";
          return [header, bullets].filter(Boolean).join("\n");
        }
        return Object.values(r).filter(Boolean).join(", ");
      }
      return String(item);
    }).join("\n\n");
  }
  return String(v);
}

export function pills(
  doc: PDFKit.PDFDocument,
  raw: string, x: number, startY: number, maxW: number,
  bg: string, fg = "#ffffff", radius = 9,
): number {
  const items = raw.split(/[,·•\n]/).map(t => t.trim()).filter(Boolean);
  let cx = x;
  let cy = startY;
  const pillH = 19;
  const padX = 10;
  const gapX = 6;
  const gapY = 5;

  for (const item of items) {
    const tw = doc.font("Helvetica").fontSize(8).widthOfString(item);
    const pillW = tw + padX * 2;
    if (cx + pillW > x + maxW && cx !== x) {
      cx = x;
      cy += pillH + gapY;
    }
    pageBreak(doc, pillH + 10);
    doc.roundedRect(cx, cy, pillW, pillH, radius).fill(bg);
    doc.font("Helvetica").fontSize(8).fillColor(fg)
      .text(item, cx + padX, cy + 5, { width: pillW - padX * 2, lineBreak: false });
    cx += pillW + gapX;
  }
  return cy + pillH + gapY;
}

export function bulletList(
  doc: PDFKit.PDFDocument,
  text: string, x: number, w: number,
  opts: { font?: string; size?: number; color?: string; indent?: number } = {},
): void {
  const { font = "Helvetica", size = 9, color = "#333333", indent = 10 } = opts;
  const lines = text.split("\n").map(l => l.replace(/^[\s\-•·*]+/, "").trim()).filter(Boolean);
  for (const line of lines) {
    pageBreak(doc, size + 12);
    doc.font(font).fontSize(size).fillColor(color)
      .text(`•  ${line}`, x + indent, doc.y, { width: w - indent });
    doc.y += 2;
  }
}

export function section(
  doc: PDFKit.PDFDocument,
  title: string, body: string | undefined,
  x: number, w: number,
  headColor: string,
  opts: { bodyBullets?: boolean; headSize?: number; bodySize?: number; headFont?: string } = {},
): void {
  if (!body) return;
  const { bodyBullets = false, headSize = 9, bodySize = 9, headFont = "Helvetica-Bold" } = opts;
  pageBreak(doc, 30);
  doc.font(headFont).fontSize(headSize).fillColor(headColor)
    .text(title.toUpperCase(), x, doc.y, { width: w });
  doc.y += 5;
  if (bodyBullets) {
    bulletList(doc, body, x, w, { size: bodySize });
  } else {
    doc.font("Helvetica").fontSize(bodySize).fillColor("#333333")
      .text(body, x, doc.y, { width: w });
  }
  doc.y += 14;
}
