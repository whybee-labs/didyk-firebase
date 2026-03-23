import {
  PW, PH, pageBreak, hr, parseResumeData, getPrimaryColor,
  renderExperience, renderEducation, renderSkillsGrid, renderProjects,
  renderOptionalSections, renderContactsInline,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const BLACK = getPrimaryColor(d, "#1a1a1a");
  const GREY = "#555555";
  const BAR_X = 28;
  const BAR_W = 3;
  const M = 52;
  const W = PW - M * 2;

  // ── Left accent bar ──
  doc.rect(BAR_X, 0, BAR_W, PH).fill("#c0c0c0");
  doc.on("pageAdded", () => { doc.rect(BAR_X, 0, BAR_W, PH).fill("#c0c0c0"); });

  // ── Centered serif name ──
  doc.font("NotoSerif-Bold").fontSize(24).fillColor(BLACK)
    .text(d.fullName, M, 40, { width: W, align: "center" });
  doc.font("NotoSerif").fontSize(10).fillColor(GREY)
    .text(d.targetRole, M, doc.y + 3, { width: W, align: "center" });

  const contacts = [d.email, d.phone, d.linkedin, d.github, d.website, d.address].filter(Boolean) as string[];
  if (contacts.length) {
    renderContactsInline(doc, contacts, M, doc.y + 8, W, "Inter", 8, "#777");
  }

  let y = doc.y + 12;
  hr(doc, M, y, W, "#999", 0.5);
  y += 16;
  doc.y = y;

  if (d.summary) {
    pageBreak(doc, 30);
    doc.font("NotoSerif-Bold").fontSize(10).fillColor(BLACK).text("Summary", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, "#bbb", 0.4);
    doc.y += 8;
    doc.font("Inter").fontSize(8.5).fillColor("#333").text(d.summary, M, doc.y, { width: W, lineGap: 1.8 });
    doc.y += 16;
  }

  if (d.experience?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10).fillColor(BLACK).text("Experience", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, "#bbb", 0.4);
    doc.y += 8;
    renderExperience(doc, d.experience, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 8;
  }

  if (d.education?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10).fillColor(BLACK).text("Education", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, "#bbb", 0.4);
    doc.y += 8;
    renderEducation(doc, d.education, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" });
    doc.y += 8;
  }

  if (d.skills?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10).fillColor(BLACK).text("Skills", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, "#bbb", 0.4);
    doc.y += 8;
    renderSkillsGrid(doc, d.skills, M, W, "Inter", "#333");
    doc.y += 10;
  }

  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10).fillColor(BLACK).text("Projects", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, "#bbb", 0.4);
    doc.y += 8;
    renderProjects(doc, d.projects, M, W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
    doc.y += 8;
  }

  renderOptionalSections(doc, d, M, W,
    (title) => { pageBreak(doc, 40); doc.font("NotoSerif-Bold").fontSize(10).fillColor(BLACK).text(title, M, doc.y, { width: W }); hr(doc, M, doc.y + 2, W, "#bbb", 0.4); doc.y += 8; },
    { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
    { title: "#111", body: "#333", meta: "#666", bullet: "#444" },
    BLACK);
}
