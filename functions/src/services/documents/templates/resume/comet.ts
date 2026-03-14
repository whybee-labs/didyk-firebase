import {
  PW, pageBreak, parseResumeData, getPrimaryColor, renderResumePhoto,
  renderExperience, renderEducation, renderSkillsPills, renderProjects,
} from "./helpers";

const DEFAULT_HEADER_BG = "#fdd835";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const headerBg = (data.backgroundColor as string) && /^#[0-9A-Fa-f]{6}$/.test(String(data.backgroundColor).trim())
    ? String(data.backgroundColor).trim() : DEFAULT_HEADER_BG;
  const textOnHeader = getPrimaryColor(d, "#1a1a1a");
  const BADGE_BG = "#1a1a1a";
  const BADGE_FG = "#ffffff";
  const M = 50;
  const W = PW - M * 2;

  doc.rect(0, 0, PW, 125).fill(headerBg);

  renderResumePhoto(doc, data, M + 40, 62, 36, "#e8e8e8", "#f5f5f5", -4);

  doc.font("Inter-Bold").fontSize(24).fillColor(textOnHeader)
    .text(d.fullName, M + 90, 28, { width: W - 95 });
  doc.font("Inter").fontSize(10).fillColor(textOnHeader)
    .text(d.targetRole, M + 90, doc.y + 3, { width: W - 95 });

  doc.y = 140;

  function badge(label: string): void {
    pageBreak(doc, 40);
    const tw = doc.font("Inter-Bold").fontSize(7).widthOfString(label);
    const bw = tw + 14;
    doc.roundedRect(M, doc.y, bw, 16, 2).fill(BADGE_BG);
    doc.font("Inter-Bold").fontSize(7).fillColor(BADGE_FG)
      .text(label, M + 7, doc.y + 4.5, { width: bw - 14, lineBreak: false });
    doc.y += 12;
  }

  const contacts = [d.email, d.phone, d.address, d.linkedin, d.website].filter(Boolean) as string[];
  if (contacts.length) {
    badge("DETAILS");
    for (const c of contacts) {
      doc.font("Inter").fontSize(8.5).fillColor("#333333").text(c, M, doc.y, { width: W });
      doc.y += 3;
    }
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
  }
}
