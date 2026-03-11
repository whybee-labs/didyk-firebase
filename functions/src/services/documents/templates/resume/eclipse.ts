import {
  PW, pageBreak, hr, parseResumeData,
  renderExperience, renderEducation, renderSkillsGrid, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const M = 55;
  const W = PW - M * 2;
  const DARK = "#1a1a1a";

  // Small role label above name
  doc.font("Inter").fontSize(9).fillColor("#777777")
    .text(d.targetRole, M, 40, { width: W, align: "center" });

  // Large serif name
  doc.font("NotoSerif-Bold").fontSize(24).fillColor(DARK)
    .text(d.fullName, M, doc.y + 3, { width: W, align: "center" });

  // Contact line
  const contacts = [d.address, d.email, d.phone, d.linkedin, d.website].filter(Boolean) as string[];
  if (contacts.length) {
    doc.font("Inter").fontSize(7.5).fillColor("#666666")
      .text(contacts.join("   •   "), M, doc.y + 5, { width: W, align: "center" });
  }

  let y = doc.y + 10;
  hr(doc, M, y, W, "#999999", 0.6);
  y += 16;
  doc.y = y;

  // Summary
  if (d.summary) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10.5).fillColor(DARK)
      .text("SUMMARY", M, doc.y, { width: W });
    hr(doc, M, doc.y + 3, W, "#cccccc", 0.3);
    doc.y += 8;
    doc.font("Inter").fontSize(8.5).fillColor("#333333")
      .text(d.summary, M, doc.y, { width: W, lineGap: 2 });
    doc.y += 18;
  }

  // Experience
  if (d.experience?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10.5).fillColor(DARK)
      .text("EXPERIENCE", M, doc.y, { width: W });
    hr(doc, M, doc.y + 3, W, "#cccccc", 0.3);
    doc.y += 8;
    renderExperience(doc, d.experience, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" },
    );
    doc.y += 10;
  }

  // Education
  if (d.education?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10.5).fillColor(DARK)
      .text("EDUCATION", M, doc.y, { width: W });
    hr(doc, M, doc.y + 3, W, "#cccccc", 0.3);
    doc.y += 8;
    renderEducation(doc, d.education, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" },
    );
    doc.y += 10;
  }

  // Skills (two-column grid)
  if (d.skills?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10.5).fillColor(DARK)
      .text("SKILLS", M, doc.y, { width: W });
    hr(doc, M, doc.y + 3, W, "#cccccc", 0.3);
    doc.y += 8;
    renderSkillsGrid(doc, d.skills, M, W, "Inter", "#333333");
    doc.y += 10;
  }

  // Projects
  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.font("NotoSerif-Bold").fontSize(10.5).fillColor(DARK)
      .text("PROJECTS", M, doc.y, { width: W });
    hr(doc, M, doc.y + 3, W, "#cccccc", 0.3);
    doc.y += 8;
    renderProjects(doc, d.projects, M, W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" },
    );
  }
}
