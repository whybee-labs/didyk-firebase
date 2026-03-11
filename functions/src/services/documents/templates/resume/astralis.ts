import {
  PW, pageBreak, hr, parseResumeData,
  renderExperience, renderEducation, renderSkillsPills, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const ACCENT = "#2d6a4f";
  const M = 44;
  const FULL_W = PW - M * 2;

  // ── Header: yellow-green circle + name ──
  doc.circle(88, 66, 48).fill("#c5e17a");
  doc.font("Inter-Bold").fontSize(22).fillColor("#111111")
    .text(d.fullName, 52, 38, { width: 260 });
  doc.font("Inter").fontSize(10).fillColor("#555555")
    .text(d.targetRole, 52, doc.y + 3, { width: 260 });

  const ROW_START = 128;

  // ── Row 1: Summary (left) + Details (right) ──
  const COL_GAP = 22;
  const SUMMARY_W = Math.round(FULL_W * 0.58);
  const DETAIL_X = M + SUMMARY_W + COL_GAP;
  const DETAIL_W = FULL_W - SUMMARY_W - COL_GAP;

  let leftY = ROW_START;
  if (d.summary) {
    doc.font("Inter-SemiBold").fontSize(9).fillColor(ACCENT).text("Summary", M, leftY, { width: SUMMARY_W });
    hr(doc, M, doc.y + 2, SUMMARY_W, ACCENT, 0.8);
    leftY = doc.y + 8;
    const maxSummary = d.summary.length > 300 ? d.summary.slice(0, 297) + "..." : d.summary;
    doc.font("Inter").fontSize(8.5).fillColor("#333333")
      .text(maxSummary, M, leftY, { width: SUMMARY_W, lineGap: 1.8 });
    leftY = doc.y + 6;
  }

  let rightY = ROW_START;
  const contactItems = [d.email, d.phone, d.address, d.linkedin, d.website].filter(Boolean) as string[];
  if (contactItems.length) {
    doc.font("Inter-SemiBold").fontSize(9).fillColor(ACCENT).text("Details", DETAIL_X, rightY, { width: DETAIL_W });
    hr(doc, DETAIL_X, doc.y + 2, DETAIL_W, ACCENT, 0.8);
    rightY = doc.y + 8;
    for (const c of contactItems) {
      doc.font("Inter").fontSize(8).fillColor("#555555").text(c, DETAIL_X, rightY, { width: DETAIL_W });
      rightY = doc.y + 4;
    }
  }

  // ── Row 2: Skills (100% width) ──
  const belowRow1 = Math.max(leftY, rightY) + 10;
  doc.y = belowRow1;

  if (d.skills?.length) {
    doc.font("Inter-SemiBold").fontSize(9).fillColor(ACCENT).text("Skills", M, doc.y, { width: FULL_W });
    hr(doc, M, doc.y + 2, FULL_W, ACCENT, 0.8);
    doc.y += 8;
    renderSkillsPills(doc, d.skills, M, doc.y, FULL_W, ACCENT);
    doc.y += 6;
  }

  // ── Full-width sections ──
  if (d.experience?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(9).fillColor(ACCENT).text("Experience", M, doc.y, { width: FULL_W });
    hr(doc, M, doc.y + 2, FULL_W, ACCENT, 0.8);
    doc.y += 8;
    renderExperience(doc, d.experience, M, FULL_W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 8;
  }

  if (d.education?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(9).fillColor(ACCENT).text("Education", M, doc.y, { width: FULL_W });
    hr(doc, M, doc.y + 2, FULL_W, ACCENT, 0.8);
    doc.y += 8;
    renderEducation(doc, d.education, M, FULL_W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" });
    doc.y += 8;
  }

  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(9).fillColor(ACCENT).text("Projects", M, doc.y, { width: FULL_W });
    hr(doc, M, doc.y + 2, FULL_W, ACCENT, 0.8);
    doc.y += 8;
    renderProjects(doc, d.projects, M, FULL_W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
  }
}
