import {
  PW, pageBreak, hr, parseResumeData,
  renderExperience, renderEducation, renderSkillsList, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const NAVY = "#1a2744";
  const GOLD = "#c9a96e";
  const M = 44;
  const W = PW - M * 2;

  // ── Header: photo circle + name ──
  doc.circle(M + 40, 56, 36).fill("#e0e0e0");
  doc.circle(M + 40, 56, 34).fill("#f0f0f0");
  doc.font("Inter").fontSize(7).fillColor("#999")
    .text("PHOTO", M + 24, 52, { width: 32, align: "center" });

  const nameX = M + 90;
  doc.font("NotoSerif-Bold").fontSize(22).fillColor(NAVY)
    .text(d.fullName, nameX, 26, { width: PW - nameX - M });
  doc.font("Inter").fontSize(9.5).fillColor("#555")
    .text(d.targetRole, nameX, doc.y + 3, { width: PW - nameX - M });

  let cY = doc.y + 5;
  const contacts = [d.email, d.phone, d.address, d.linkedin, d.website].filter(Boolean) as string[];
  for (const c of contacts) {
    doc.font("Inter").fontSize(8).fillColor("#777").text(c, nameX, cY, { width: PW - nameX - M });
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
  }
}
