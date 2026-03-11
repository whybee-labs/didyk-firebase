import {
  PW, pageBreak, hr, parseResumeData,
  renderExperience, renderEducation, renderSkillsPills, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const BG = "#f0f7da";
  const ACCENT = "#2d5016";
  const M = 48;
  const W = PW - M * 2;

  // Sage tint as top header band only (full-page fill causes layout issues)
  doc.rect(0, 0, PW, 120).fill(BG);

  doc.font("Inter-Bold").fontSize(26).fillColor("#111111")
    .text(d.fullName, M, 40, { width: W * 0.6 });
  doc.font("Inter").fontSize(10).fillColor("#555555")
    .text(d.targetRole, M, doc.y + 4, { width: W * 0.6 });

  let dY = 44;
  const DX = PW - M - 180;
  const DW = 180;
  const contactItems: { label: string; value: string }[] = [];
  if (d.phone) contactItems.push({ label: "Phone", value: d.phone });
  if (d.email) contactItems.push({ label: "Email", value: d.email });
  if (d.address) contactItems.push({ label: "Location", value: d.address });
  if (d.linkedin) contactItems.push({ label: "LinkedIn", value: d.linkedin });

  for (const { label, value } of contactItems) {
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor("#777").text(label, DX, dY, { width: 58 });
    doc.font("Inter").fontSize(8).fillColor("#333").text(value, DX + 60, dY, { width: DW - 60 });
    dY += 15;
  }

  let y = Math.max(doc.y + 12, dY + 4);
  hr(doc, M, y, W, "#bbb", 0.5);
  y += 14;
  doc.y = y;

  if (d.summary) {
    doc.font("Inter-SemiBold").fontSize(10).fillColor(ACCENT).text("Summary", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, ACCENT, 0.8);
    doc.y += 8;
    doc.font("Inter").fontSize(8.5).fillColor("#333").text(d.summary, M, doc.y, { width: W, lineGap: 1.8 });
    doc.y += 16;
  }

  if (d.experience?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(ACCENT).text("Experience", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, ACCENT, 0.8);
    doc.y += 8;
    renderExperience(doc, d.experience, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 8;
  }

  if (d.education?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(ACCENT).text("Education", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, ACCENT, 0.8);
    doc.y += 8;
    renderEducation(doc, d.education, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" });
    doc.y += 8;
  }

  if (d.skills?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(ACCENT).text("Skills", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, ACCENT, 0.8);
    doc.y += 8;
    renderSkillsPills(doc, d.skills, M, doc.y, W, ACCENT);
    doc.y += 10;
  }

  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(ACCENT).text("Projects", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, ACCENT, 0.8);
    doc.y += 8;
    renderProjects(doc, d.projects, M, W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
  }
}
