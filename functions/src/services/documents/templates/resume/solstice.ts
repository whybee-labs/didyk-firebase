import {
  PW, pageBreak, hr, parseResumeData,
  renderExperience, renderEducation, renderSkillsGrid, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const BLACK = "#1a1a1a";
  const GREY = "#555555";
  const M = 52;
  const W = PW - M * 2;

  // ── Centered serif name ──
  doc.font("NotoSerif-Bold").fontSize(24).fillColor(BLACK)
    .text(d.fullName, M, 40, { width: W, align: "center" });
  doc.font("NotoSerif").fontSize(10).fillColor(GREY)
    .text(d.targetRole, M, doc.y + 3, { width: W, align: "center" });

  const contacts = [d.email, d.phone, d.address, d.linkedin, d.website].filter(Boolean) as string[];
  if (contacts.length) {
    doc.font("Inter").fontSize(8).fillColor("#777")
      .text(contacts.join("   •   "), M, doc.y + 8, { width: W, align: "center" });
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
  }
}
