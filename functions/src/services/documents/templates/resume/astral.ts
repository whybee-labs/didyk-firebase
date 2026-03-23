import {
  PW, pageBreak, hr, parseResumeData, getPrimaryColor, renderContactItem,
  renderExperience, renderEducation, renderSkillsList, renderProjects,
  renderOptionalSections,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const NAVY = getPrimaryColor(d, "#1a2744");
  const GOLD = "#c9a96e";
  const M = 44;
  const W = PW - M * 2;

  // ── Header: name + contacts ──
  doc.font("NotoSerif-Bold").fontSize(22).fillColor(NAVY)
    .text(d.fullName, M, 26, { width: W });
  doc.font("Inter").fontSize(9.5).fillColor("#555")
    .text(d.targetRole, M, doc.y + 3, { width: W });

  let cY = doc.y + 5;
  const contacts = [d.email, d.phone, d.linkedin, d.github, d.website, d.address].filter(Boolean) as string[];
  for (const c of contacts) {
    renderContactItem(doc, c, M, cY, W, "Inter", 8, "#777");
    cY = doc.y + 2;
  }

  const ROW_START = Math.max(cY, 100) + 10;
  hr(doc, M, ROW_START - 4, W, GOLD, 1.5);
  doc.y = ROW_START + 8;

  if (d.summary) {
    doc.font("NotoSerif-Bold").fontSize(10).fillColor(NAVY).text("Summary", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, GOLD, 0.8);
    doc.y += 8;
    doc.font("Inter").fontSize(8.5).fillColor("#333").text(d.summary, M, doc.y, { width: W, lineGap: 1.8 });
    doc.y += 16;
  }

  if (d.experience?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10).fillColor(NAVY).text("Experience", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, GOLD, 0.8);
    doc.y += 8;
    renderExperience(doc, d.experience, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 8;
  }

  if (d.education?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10).fillColor(NAVY).text("Education", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, GOLD, 0.8);
    doc.y += 8;
    renderEducation(doc, d.education, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" });
    doc.y += 8;
  }

  if (d.skills?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10).fillColor(NAVY).text("Skills", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, GOLD, 0.8);
    doc.y += 8;
    renderSkillsList(doc, d.skills, M, W, "Inter", "#333");
    doc.y += 10;
  }

  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10).fillColor(NAVY).text("Projects", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, GOLD, 0.8);
    doc.y += 8;
    renderProjects(doc, d.projects, M, W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
    doc.y += 8;
  }

  renderOptionalSections(doc, d, M, W,
    (title) => { pageBreak(doc, 40); doc.font("NotoSerif-Bold").fontSize(10).fillColor(NAVY).text(title, M, doc.y, { width: W }); hr(doc, M, doc.y + 2, W, GOLD, 0.8); doc.y += 8; },
    { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
    { title: "#111", body: "#333", meta: "#666", bullet: "#444" },
    NAVY);
}
