import {
  PW, pageBreak, hr, parseResumeData, getPrimaryColor,
  renderExperience, renderEducation, renderSkillsGrid, renderProjects,
} from "./helpers";

const DEFAULT_HEADER_BG = "#2c2c2c";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const headerBg = (data.backgroundColor as string) && /^#[0-9A-Fa-f]{6}$/.test(String(data.backgroundColor).trim())
    ? String(data.backgroundColor).trim() : DEFAULT_HEADER_BG;
  const textOnHeader = getPrimaryColor(d, "#ffffff");
  const M = 48;
  const W = PW - M * 2;

  doc.rect(0, 0, PW, 88).fill(headerBg);

  doc.font("Inter-Bold").fontSize(22).fillColor(textOnHeader)
    .text(d.fullName, M, 20, { width: W * 0.55 });

  const contacts = [d.email, d.phone, d.address].filter(Boolean) as string[];
  if (contacts.length) {
    doc.font("Inter").fontSize(8).fillColor(textOnHeader)
      .text(contacts.join("  |  "), M, doc.y + 3, { width: W });
  }
  if (d.linkedin || d.website) {
    const links = [d.linkedin, d.website].filter(Boolean) as string[];
    doc.font("Inter").fontSize(8).fillColor(textOnHeader)
      .text(links.join("  |  "), M, doc.y + 2, { width: W });
  }

  doc.font("Inter").fontSize(10).fillColor(textOnHeader)
    .text(d.targetRole, PW - M - 200, 28, { width: 200, align: "right" });

  let y = 102;
  doc.y = y;

  if (d.summary) {
    doc.font("Inter-SemiBold").fontSize(11).fillColor(headerBg).text("Summary", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, headerBg, 1);
    doc.y += 8;
    doc.font("Inter").fontSize(8.5).fillColor("#333").text(d.summary, M, doc.y, { width: W, lineGap: 1.8 });
    doc.y += 16;
  }

  if (d.experience?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(11).fillColor(headerBg).text("Experience", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, headerBg, 1);
    doc.y += 8;
    renderExperience(doc, d.experience, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 8;
  }

  if (d.education?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(11).fillColor(headerBg).text("Education", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, headerBg, 1);
    doc.y += 8;
    renderEducation(doc, d.education, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" });
    doc.y += 8;
  }

  if (d.skills?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(11).fillColor(headerBg).text("Skills", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, headerBg, 1);
    doc.y += 8;
    renderSkillsGrid(doc, d.skills, M, W, "Inter", "#333");
    doc.y += 10;
  }

  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(11).fillColor(headerBg).text("Projects", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, headerBg, 1);
    doc.y += 8;
    renderProjects(doc, d.projects, M, W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
  }
}
