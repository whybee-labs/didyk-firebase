import {
  PW, pageBreak, hr, parseResumeData, getPrimaryColor,
  renderExperience, renderEducation, renderSkillsGrid, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const M = 55;
  const W = PW - M * 2;
  const NAVY = getPrimaryColor(d, "#1a2744");

  // Name (bold, uppercase, centered, serif)
  doc.font("NotoSerif-Bold").fontSize(22).fillColor(NAVY)
    .text(d.fullName.toUpperCase(), M, 38, { width: W, align: "center", characterSpacing: 2 });

  // Role
  doc.font("NotoSerif-Italic").fontSize(11).fillColor("#555555")
    .text(d.targetRole, M, doc.y + 3, { width: W, align: "center" });

  // Contact line
  const contacts = [d.address, d.email, d.phone, d.linkedin].filter(Boolean) as string[];
  if (contacts.length) {
    doc.font("Inter").fontSize(7.5).fillColor("#666666")
      .text(contacts.join("     •     "), M, doc.y + 5, { width: W, align: "center" });
  }

  let y = doc.y + 10;
  hr(doc, M, y, W, NAVY, 1.2);
  y += 16;

  // Centered heading with rules on each side
  function centeredHeading(title: string, atY: number): number {
    const tw = doc.font("NotoSerif-Bold").fontSize(10.5).widthOfString(title);
    const lineW = (W - tw - 24) / 2;
    hr(doc, M, atY + 6, lineW, "#bbbbbb", 0.4);
    doc.font("NotoSerif-Bold").fontSize(10.5).fillColor(NAVY)
      .text(title, M, atY, { width: W, align: "center" });
    hr(doc, M + W - lineW, atY + 6, lineW, "#bbbbbb", 0.4);
    return doc.y + 10;
  }

  // Summary
  if (d.summary) {
    y = centeredHeading("SUMMARY", y);
    doc.font("NotoSerif").fontSize(9).fillColor("#333333")
      .text(d.summary, M, y, { width: W, align: "justify", lineGap: 2 });
    y = doc.y + 18;
  }

  // Experience
  if (d.experience?.length) {
    pageBreak(doc, 40);
    doc.y = y;
    y = centeredHeading("EXPERIENCE", doc.y);
    doc.y = y;
    renderExperience(doc, d.experience, M, W,
      { title: "NotoSerif-Bold", body: "NotoSerif", meta: "NotoSerif-Italic", bullet: "NotoSerif" },
      { title: NAVY, meta: "#666", body: "#333", bullet: "#444" },
    );
    y = doc.y + 12;
  }

  // Education
  if (d.education?.length) {
    pageBreak(doc, 40);
    doc.y = y;
    y = centeredHeading("EDUCATION", doc.y);
    doc.y = y;
    renderEducation(doc, d.education, M, W,
      { title: "NotoSerif-Bold", body: "NotoSerif", meta: "NotoSerif-Italic" },
      { title: NAVY, meta: "#666", body: "#555" },
    );
    y = doc.y + 12;
  }

  // Skills (two-column grid)
  if (d.skills?.length) {
    pageBreak(doc, 40);
    doc.y = y;
    y = centeredHeading("SKILLS", doc.y);
    doc.y = y;
    renderSkillsGrid(doc, d.skills, M, W, "Inter", "#333333");
    y = doc.y + 12;
  }

  // Projects
  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.y = y;
    y = centeredHeading("PROJECTS", doc.y);
    doc.y = y;
    renderProjects(doc, d.projects, M, W,
      { title: "NotoSerif-Bold", body: "NotoSerif", bullet: "NotoSerif" },
      { title: NAVY, body: "#444", bullet: "#444" },
    );
  }
}
