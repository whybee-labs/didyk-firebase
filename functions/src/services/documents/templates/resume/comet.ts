import {
  PW, pageBreak, parseResumeData, getPrimaryColor, autoFitText,
  renderExperience, renderEducation, renderSkillsPills, renderProjects,
  renderOptionalSections, renderContactsInline,
} from "./helpers";

const DEFAULT_HEADER_BG = "#e8dff0";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const headerBg = (data.backgroundColor as string) && /^#[0-9A-Fa-f]{6}$/.test(String(data.backgroundColor).trim())
    ? String(data.backgroundColor).trim() : DEFAULT_HEADER_BG;
  const textOnHeader = getPrimaryColor(d, "#1a1a1a");
  const BADGE_BG = "#1a1a1a";
  const BADGE_FG = "#ffffff";
  const M = 50;
  const W = PW - M * 2;

  const contacts = [d.email, d.phone, d.linkedin, d.github, d.website, d.address].filter(Boolean) as string[];
  const headerH = 100 + (contacts.length > 3 ? 18 : 0);
  doc.rect(0, 0, PW, headerH).fill(headerBg);

  const nameSize = autoFitText(doc, d.fullName, "Inter-Bold", 24, 14, W);
  doc.font("Inter-Bold").fontSize(nameSize).fillColor(textOnHeader)
    .text(d.fullName, M, 24, { width: W, align: "center" });
  doc.font("Inter").fontSize(10).fillColor(textOnHeader)
    .text(d.targetRole, M, doc.y + 3, { width: W, align: "center" });

  if (contacts.length) {
    renderContactsInline(doc, contacts, M, doc.y + 8, W, "Inter", 8, textOnHeader);
  }

  doc.y = headerH + 14;

  function badge(label: string): void {
    pageBreak(doc, 40);
    const tw = doc.font("Inter-Bold").fontSize(7).widthOfString(label);
    const bw = tw + 14;
    doc.roundedRect(M, doc.y, bw, 16, 2).fill(BADGE_BG);
    doc.font("Inter-Bold").fontSize(7).fillColor(BADGE_FG)
      .text(label, M + 7, doc.y + 4.5, { width: bw - 14, lineBreak: false });
    doc.y += 12;
  }

  if (d.summary) {
    badge("SUMMARY");
    doc.font("Inter").fontSize(8.5).fillColor("#333333")
      .text(d.summary, M, doc.y, { width: W, lineGap: 1.8 });
    doc.y += 16;
  }

  if (d.experience?.length) {
    badge("EXPERIENCE");
    renderExperience(doc, d.experience, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 10;
  }

  if (d.education?.length) {
    badge("EDUCATION");
    renderEducation(doc, d.education, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" });
    doc.y += 10;
  }

  if (d.skills?.length) {
    badge("SKILLS");
    renderSkillsPills(doc, d.skills, M, doc.y, W, headerBg, textOnHeader);
    doc.y += 10;
  }

  if (d.projects?.length) {
    badge("PROJECTS");
    renderProjects(doc, d.projects, M, W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
    doc.y += 10;
  }

  renderOptionalSections(doc, d, M, W,
    (title) => badge(title.toUpperCase()),
    { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
    { title: "#111", body: "#333", meta: "#666", bullet: "#444" },
    headerBg, textOnHeader);
}
