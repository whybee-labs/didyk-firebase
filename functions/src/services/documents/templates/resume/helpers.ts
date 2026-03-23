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

export interface ResumeVolunteer {
  role: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  bullets?: string[];
}

export interface ResumeCertification {
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
}

export interface ResumeAward {
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface ResumeLanguage {
  language: string;
  proficiency?: string;
}

export interface ResumeOrganization {
  name: string;
  role?: string;
  startDate?: string;
  endDate?: string;
}

export interface ResumeAchievement {
  title: string;
  description?: string;
  url?: string;
}

export interface ResumeConference {
  name: string;
  role?: string;
  date?: string;
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
  volunteer?: ResumeVolunteer[];
  certifications?: ResumeCertification[];
  awards?: ResumeAward[];
  languages?: ResumeLanguage[];
  interests?: string[];
  organizations?: ResumeOrganization[];
  achievements?: ResumeAchievement[];
  conferences?: ResumeConference[];
  causes?: string[];
  email?: string;
  phone?: string;
  address?: string;
  linkedin?: string;
  github?: string;
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
    fullName:       String(raw.fullName ?? ""),
    targetRole:     String(raw.targetRole ?? ""),
    summary:        raw.summary ? String(raw.summary) : undefined,
    experience:     parseExperience(raw.experience),
    education:      parseEducation(raw.education),
    skills:         parseSkills(raw.skills),
    projects:       parseProjects(raw.projects),
    volunteer:      parseObjectArray<ResumeVolunteer>(raw.volunteer),
    certifications: parseObjectArray<ResumeCertification>(raw.certifications),
    awards:         parseObjectArray<ResumeAward>(raw.awards),
    languages:      parseObjectArray<ResumeLanguage>(raw.languages),
    interests:      parseSkills(raw.interests),
    organizations:  parseObjectArray<ResumeOrganization>(raw.organizations),
    achievements:   parseObjectArray<ResumeAchievement>(raw.achievements),
    conferences:    parseObjectArray<ResumeConference>(raw.conferences),
    causes:         parseSkills(raw.causes),
    email:          raw.email ? String(raw.email) : undefined,
    phone:          raw.phone ? String(raw.phone) : undefined,
    address:        raw.address ? String(raw.address) : undefined,
    linkedin:       raw.linkedin ? String(raw.linkedin) : undefined,
    github:         raw.github ? String(raw.github) : undefined,
    website:        raw.website ? String(raw.website) : undefined,
    primaryColor:   raw.primaryColor ? String(raw.primaryColor) : undefined,
  };
}

/** Generic parser for arrays of objects (certifications, awards, etc.) */
function parseObjectArray<T>(val: unknown): T[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val) && val.length > 0) return val as T[];
  if (!Array.isArray(val) && typeof val === "object") return [val as T];
  return undefined;
}

function parseExperience(val: unknown): ResumeJob[] | undefined {
  if (!val) return undefined;
  if (!Array.isArray(val) && typeof val === "object") return [val as ResumeJob];
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
  if (!Array.isArray(val) && typeof val === "object") return [val as ResumeEducation];
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
  if (!Array.isArray(val) && typeof val === "object") return [val as ResumeProject];
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

// ── Auto-fit text helper ─────────────────────────────────────────────────────

/** Shrink font size until text fits within maxWidth. Returns the chosen size. */
export function autoFitText(
  doc: PDFKit.PDFDocument,
  text: string, font: string,
  maxSize: number, minSize: number,
  maxWidth: number,
  characterSpacing = 0,
): number {
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    doc.font(font).fontSize(size);
    const w = doc.widthOfString(text) + characterSpacing * Math.max(0, text.length - 1);
    if (w <= maxWidth) return size;
  }
  return minSize;
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

/** Convert a contact value to a clickable URL for PDFKit `link:` option. */
export function contactUrl(value: string): string | undefined {
  const v = value.trim();
  if (v.includes("@") && !v.startsWith("http")) return `mailto:${v}`;
  if (v.match(/^[\d\s()+-]+$/)) return `tel:${v.replace(/\s/g, "")}`;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.includes(".")) return `https://${v}`;
  return undefined;
}

/** Render contacts as centered inline lines with separator, each item clickable. Max 3 per line. */
export function renderContactsInline(
  doc: PDFKit.PDFDocument,
  contacts: string[],
  x: number, y: number, w: number,
  font: string, fontSize: number, color: string,
  separator = "   |   ",
  maxPerLine = 3,
): void {
  if (!contacts.length) return;
  const lineH = fontSize + 6;
  let ly = y;
  for (let start = 0; start < contacts.length; start += maxPerLine) {
    const chunk = contacts.slice(start, start + maxPerLine);
    const sepW = doc.font(font).fontSize(fontSize).widthOfString(separator);
    const itemWidths = chunk.map(c => doc.font(font).fontSize(fontSize).widthOfString(c));
    const totalW = itemWidths.reduce((a, b) => a + b, 0) + sepW * (chunk.length - 1);
    let cx = x + (w - totalW) / 2;
    for (let i = 0; i < chunk.length; i++) {
      const link = contactUrl(chunk[i]);
      const opts: Record<string, unknown> = { width: itemWidths[i] + 1, lineBreak: false };
      if (link) { opts.link = link; opts.underline = true; }
      doc.font(font).fontSize(fontSize).fillColor(color)
        .text(chunk[i], cx, ly, opts);
      cx += itemWidths[i];
      if (i < chunk.length - 1) {
        doc.font(font).fontSize(fontSize).fillColor(color)
          .text(separator, cx, ly, { width: sepW + 1, lineBreak: false });
        cx += sepW;
      }
    }
    ly += lineH;
  }
  doc.y = ly;
}

/** Render a single contact item with clickable link (for vertical lists). */
export function renderContactItem(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number, y: number, w: number,
  font: string, fontSize: number, color: string,
): void {
  const link = contactUrl(value);
  const opts: Record<string, unknown> = { width: w };
  if (link) { opts.link = link; opts.underline = true; }
  doc.font(font).fontSize(fontSize).fillColor(color)
    .text(value, x, y, opts);
}

// ── Shared section renderers (used by polished batch-1 templates) ────────────

/** Group jobs by company name for rendering. Preserves array order. */
function groupJobsByCompany(jobs: ResumeJob[]): Array<{ company: string; location?: string; roles: ResumeJob[] }> {
  const groups: Map<string, { company: string; location?: string; roles: ResumeJob[] }> = new Map();
  const order: string[] = [];

  for (const job of jobs) {
    const key = (job.company || "").trim().toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, { company: job.company, location: job.location, roles: [] });
      order.push(key);
    }
    groups.get(key)!.roles.push(job);
  }

  return order.map((k) => groups.get(k)!);
}

function renderSingleRole(
  doc: PDFKit.PDFDocument, job: ResumeJob,
  x: number, w: number, indent: number,
  fonts: { title: string; body: string; meta: string; bullet: string },
  colors: { title: string; meta: string; body: string; bullet: string },
  showCompany: boolean,
): void {
  pageBreak(doc, 50);

  // Title
  doc.font(fonts.title).fontSize(10).fillColor(colors.title)
    .text(job.title, x + indent, doc.y, { width: w - indent, continued: false });

  if (showCompany) {
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
  } else {
    // Sub-role under grouped company — show dates only
    const dateLine = [job.startDate, job.endDate].filter(Boolean).join(" – ");
    if (dateLine) {
      doc.font(fonts.meta).fontSize(8.5).fillColor(colors.meta)
        .text(dateLine, x + indent, doc.y + 1, { width: w - indent });
    }
  }

  doc.y += 3;

  // Bullets
  const bulletIndent = x + indent + 8;
  const bulletW = w - indent - 16;
  for (const b of job.bullets) {
    pageBreak(doc, 14);
    doc.font(fonts.bullet).fontSize(8.5).fillColor(colors.bullet)
      .text(`•   ${b}`, bulletIndent, doc.y, { width: bulletW, lineGap: 1.5 });
    doc.y += 2;
  }

  if (job.url) {
    pageBreak(doc, 14);
    doc.font(fonts.meta).fontSize(7.5).fillColor("#2563eb")
      .text(job.url, bulletIndent, doc.y + 1, { width: bulletW, link: job.url, underline: true });
    doc.y += 3;
  }
}

export function renderExperience(
  doc: PDFKit.PDFDocument,
  jobs: ResumeJob[],
  x: number, w: number,
  fonts: { title: string; body: string; meta: string; bullet: string },
  colors: { title: string; meta: string; body: string; bullet: string },
): void {
  const groups = groupJobsByCompany(jobs);

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];

    if (group.roles.length === 1) {
      // Single role at company — render normally
      renderSingleRole(doc, group.roles[0], x, w, 0, fonts, colors, true);
    } else {
      // Multiple roles — company header + indented sub-roles
      pageBreak(doc, 50);
      const loc = group.location ? `, ${group.location}` : "";
      doc.font(fonts.title).fontSize(10).fillColor(colors.title)
        .text(`${group.company}${loc}`, x, doc.y, { width: w });
      doc.y += 4;

      for (let ri = 0; ri < group.roles.length; ri++) {
        renderSingleRole(doc, group.roles[ri], x, w, 10, fonts, colors, false);
        if (ri < group.roles.length - 1) doc.y += 6;
      }
    }

    if (gi < groups.length - 1) doc.y += 10;
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

// ── Render functions for additional sections ────────────────────────────────

export function renderVolunteer(
  doc: PDFKit.PDFDocument,
  entries: ResumeVolunteer[],
  x: number, w: number,
  fonts: { title: string; meta: string; bullet: string },
  colors: { title: string; meta: string; bullet: string },
): void {
  for (let i = 0; i < entries.length; i++) {
    const v = entries[i];
    pageBreak(doc, 36);

    doc.font(fonts.title).fontSize(9.5).fillColor(colors.title)
      .text(v.role, x, doc.y, { width: w });

    const orgLine = v.organization;
    const dateLine = [v.startDate, v.endDate].filter(Boolean).join(" – ");
    doc.font(fonts.meta).fontSize(8.5).fillColor(colors.meta);
    if (dateLine) {
      const dateW = doc.widthOfString(dateLine);
      const metaY = doc.y + 1;
      doc.text(orgLine, x, metaY, { width: w - dateW - 10 });
      doc.text(dateLine, x + w - dateW, metaY, { width: dateW, align: "right" });
      doc.y = metaY + 12;
    } else {
      doc.text(orgLine, x, doc.y + 1, { width: w });
    }
    doc.y += 3;

    if (v.bullets) {
      for (const b of v.bullets) {
        pageBreak(doc, 14);
        doc.font(fonts.bullet).fontSize(8.5).fillColor(colors.bullet)
          .text(`•   ${b}`, x + 8, doc.y, { width: w - 16, lineGap: 1.5 });
        doc.y += 2;
      }
    }
    if (i < entries.length - 1) doc.y += 8;
  }
}

export function renderCertifications(
  doc: PDFKit.PDFDocument,
  entries: ResumeCertification[],
  x: number, w: number,
  fonts: { title: string; meta: string },
  colors: { title: string; meta: string },
): void {
  for (let i = 0; i < entries.length; i++) {
    const c = entries[i];
    pageBreak(doc, 24);

    doc.font(fonts.title).fontSize(9.5).fillColor(colors.title)
      .text(c.name, x, doc.y, { width: w });

    const metaLine = [c.issuer, c.date].filter(Boolean).join(" — ");
    if (metaLine) {
      doc.font(fonts.meta).fontSize(8.5).fillColor(colors.meta)
        .text(metaLine, x, doc.y + 1, { width: w });
    }

    if (c.url) {
      pageBreak(doc, 14);
      doc.font(fonts.meta).fontSize(7.5).fillColor("#2563eb")
        .text(c.url, x + 8, doc.y + 1, { width: w - 16, link: c.url, underline: true });
      doc.y += 3;
    }
    if (i < entries.length - 1) doc.y += 6;
  }
}

export function renderAwards(
  doc: PDFKit.PDFDocument,
  entries: ResumeAward[],
  x: number, w: number,
  fonts: { title: string; meta: string; body: string },
  colors: { title: string; meta: string; body: string },
): void {
  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    pageBreak(doc, 24);

    doc.font(fonts.title).fontSize(9.5).fillColor(colors.title)
      .text(a.title, x, doc.y, { width: w });

    const metaLine = [a.issuer, a.date].filter(Boolean).join(" — ");
    if (metaLine) {
      doc.font(fonts.meta).fontSize(8.5).fillColor(colors.meta)
        .text(metaLine, x, doc.y + 1, { width: w });
    }

    if (a.description) {
      doc.font(fonts.body).fontSize(8.5).fillColor(colors.body)
        .text(a.description, x, doc.y + 2, { width: w, lineGap: 1.2 });
    }
    if (i < entries.length - 1) doc.y += 6;
  }
}

export function renderLanguages(
  doc: PDFKit.PDFDocument,
  entries: ResumeLanguage[],
  x: number, w: number,
  fonts: { title: string; meta: string },
  colors: { title: string; meta: string },
): void {
  const colW = w / 2 - 10;
  const startY = doc.y;
  const half = Math.ceil(entries.length / 2);

  for (let i = 0; i < half; i++) {
    const e = entries[i];
    const label = e.proficiency ? `${e.language} — ${e.proficiency}` : e.language;
    doc.font(fonts.title).fontSize(8.5).fillColor(colors.title)
      .text(`•   ${label}`, x, startY + i * 15, { width: colW });
  }
  for (let i = half; i < entries.length; i++) {
    const e = entries[i];
    const label = e.proficiency ? `${e.language} — ${e.proficiency}` : e.language;
    doc.font(fonts.title).fontSize(8.5).fillColor(colors.title)
      .text(`•   ${label}`, x + colW + 20, startY + (i - half) * 15, { width: colW });
  }
  doc.y = startY + half * 15;
}

export function renderOrganizations(
  doc: PDFKit.PDFDocument,
  entries: ResumeOrganization[],
  x: number, w: number,
  fonts: { title: string; meta: string },
  colors: { title: string; meta: string },
): void {
  for (let i = 0; i < entries.length; i++) {
    const o = entries[i];
    pageBreak(doc, 24);

    const titleLine = o.role ? `${o.role} — ${o.name}` : o.name;
    doc.font(fonts.title).fontSize(9.5).fillColor(colors.title)
      .text(titleLine, x, doc.y, { width: w });

    const dateLine = [o.startDate, o.endDate].filter(Boolean).join(" – ");
    if (dateLine) {
      doc.font(fonts.meta).fontSize(8.5).fillColor(colors.meta)
        .text(dateLine, x, doc.y + 1, { width: w });
    }
    if (i < entries.length - 1) doc.y += 6;
  }
}

export function renderAchievements(
  doc: PDFKit.PDFDocument,
  entries: ResumeAchievement[],
  x: number, w: number,
  fonts: { title: string; body: string },
  colors: { title: string; body: string },
): void {
  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    pageBreak(doc, 24);

    doc.font(fonts.title).fontSize(9.5).fillColor(colors.title)
      .text(`•   ${a.title}`, x, doc.y, { width: w });

    if (a.description) {
      doc.font(fonts.body).fontSize(8.5).fillColor(colors.body)
        .text(a.description, x + 16, doc.y + 1, { width: w - 16, lineGap: 1.2 });
    }
    if (a.url) {
      pageBreak(doc, 14);
      doc.font(fonts.body).fontSize(7.5).fillColor("#2563eb")
        .text(a.url, x + 16, doc.y + 1, { width: w - 16, link: a.url, underline: true });
      doc.y += 3;
    }
    if (i < entries.length - 1) doc.y += 4;
  }
}

export function renderConferences(
  doc: PDFKit.PDFDocument,
  entries: ResumeConference[],
  x: number, w: number,
  fonts: { title: string; meta: string },
  colors: { title: string; meta: string },
): void {
  for (let i = 0; i < entries.length; i++) {
    const c = entries[i];
    pageBreak(doc, 24);

    const titleLine = c.role ? `${c.name} — ${c.role}` : c.name;
    doc.font(fonts.title).fontSize(9.5).fillColor(colors.title)
      .text(titleLine, x, doc.y, { width: w });

    if (c.date) {
      doc.font(fonts.meta).fontSize(8.5).fillColor(colors.meta)
        .text(c.date, x, doc.y + 1, { width: w });
    }

    if (c.url) {
      doc.font(fonts.meta).fontSize(7.5).fillColor("#2563eb")
        .text(c.url, x + 8, doc.y + 1, { width: w - 16, link: c.url, underline: true });
      doc.y += 3;
    }
    if (i < entries.length - 1) doc.y += 6;
  }
}

/** Generic section renderer for new optional sections. Renders section only if data exists.
 *  Pass `skip` to exclude sections already rendered elsewhere (e.g. in a sidebar). */
export function renderOptionalSections(
  doc: PDFKit.PDFDocument,
  d: ResumeData,
  x: number, w: number,
  sectionTitle: (title: string) => void,
  fonts: { title: string; body: string; meta: string; bullet: string },
  colors: { title: string; body: string; meta: string; bullet: string },
  pillBg: string,
  pillFg = "#ffffff",
  skip: string[] = [],
): void {
  if (d.volunteer?.length && !skip.includes("volunteer")) {
    sectionTitle("Volunteer");
    renderVolunteer(doc, d.volunteer, x, w, fonts, colors);
    doc.y += 10;
  }
  if (d.certifications?.length && !skip.includes("certifications")) {
    sectionTitle("Certifications");
    renderCertifications(doc, d.certifications, x, w, fonts, colors);
    doc.y += 10;
  }
  if (d.awards?.length && !skip.includes("awards")) {
    sectionTitle("Awards");
    renderAwards(doc, d.awards, x, w, fonts, colors);
    doc.y += 10;
  }
  if (d.languages?.length && !skip.includes("languages")) {
    sectionTitle("Languages");
    renderLanguages(doc, d.languages, x, w, fonts, colors);
    doc.y += 10;
  }
  if (d.interests?.length && !skip.includes("interests")) {
    sectionTitle("Interests");
    renderSkillsPills(doc, d.interests, x, doc.y, w, pillBg, pillFg);
    doc.y += 4;
  }
  if (d.organizations?.length && !skip.includes("organizations")) {
    sectionTitle("Organizations");
    renderOrganizations(doc, d.organizations, x, w, fonts, colors);
    doc.y += 10;
  }
  if (d.achievements?.length && !skip.includes("achievements")) {
    sectionTitle("Achievements");
    renderAchievements(doc, d.achievements, x, w, fonts, colors);
    doc.y += 10;
  }
  if (d.conferences?.length && !skip.includes("conferences")) {
    sectionTitle("Conferences");
    renderConferences(doc, d.conferences, x, w, fonts, colors);
    doc.y += 10;
  }
  if (d.causes?.length && !skip.includes("causes")) {
    sectionTitle("Causes");
    renderSkillsPills(doc, d.causes, x, doc.y, w, pillBg, pillFg);
    doc.y += 4;
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
