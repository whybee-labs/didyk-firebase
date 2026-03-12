/**
 * ATS-friendly template: single column, standard headings, no sidebars or boxes.
 * Optimized for Applicant Tracking Systems to parse section order and content correctly.
 */
import {
  PW, pageBreak, hr, parseResumeData, getPrimaryColor,
  renderExperience, renderEducation, renderSkillsList, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const PRIMARY = getPrimaryColor(d, "#1a2744");
  const M = 50;
  const W = PW - M * 2;

  // Name (plain text, no box)
  doc.font("Inter-Bold").fontSize(20).fillColor(PRIMARY)
    .text(d.fullName, M, 40, { width: W });
  doc.font("Inter").fontSize(10).fillColor("#555")
    .text(d.targetRole, M, doc.y + 2, { width: W });

  const contacts = [d.email, d.phone, d.address, d.linkedin, d.website].filter(Boolean) as string[];
  if (contacts.length) {
    doc.font("Inter").fontSize(9).fillColor("#666")
      .text(contacts.join("  |  "), M, doc.y + 6, { width: W });
  }

  let y = doc.y + 12;
  hr(doc, M, y, W, PRIMARY, 0.5);
  y += 14;
  doc.y = y;

  if (d.summary) {
    pageBreak(doc, 50);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(PRIMARY)
      .text("SUMMARY", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, PRIMARY, 0.4);
    doc.y += 8;
    doc.font("Inter").fontSize(9).fillColor("#333")
      .text(d.summary, M, doc.y, { width: W, lineGap: 1.8 });
    doc.y += 14;
  }

  if (d.experience?.length) {
    pageBreak(doc, 50);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(PRIMARY)
      .text("EXPERIENCE", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, PRIMARY, 0.4);
    doc.y += 8;
    renderExperience(doc, d.experience, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 10;
  }

  if (d.education?.length) {
    pageBreak(doc, 50);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(PRIMARY)
      .text("EDUCATION", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, PRIMARY, 0.4);
    doc.y += 8;
    renderEducation(doc, d.education, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" });
    doc.y += 10;
  }

  if (d.skills?.length) {
    pageBreak(doc, 50);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(PRIMARY)
      .text("SKILLS", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, PRIMARY, 0.4);
    doc.y += 8;
    renderSkillsList(doc, d.skills, M, W, "Inter", "#333");
    doc.y += 10;
  }

  if (d.projects?.length) {
    pageBreak(doc, 50);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(PRIMARY)
      .text("PROJECTS", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, PRIMARY, 0.4);
    doc.y += 8;
    renderProjects(doc, d.projects, M, W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
  }
}
