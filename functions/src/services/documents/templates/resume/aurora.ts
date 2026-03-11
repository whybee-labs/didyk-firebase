import {
  PW, pageBreak, parseResumeData,
  renderExperience, renderEducation, renderSkillsPills, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const PINK = "#d4637a";
  const PINK_LIGHT = "#fce4ec";
  const DARK = "#2c2c2c";
  const M = 44;
  const W = PW - M * 2;

  // ── Blush header area ──
  doc.rect(0, 0, PW * 0.44, 118).fill(PINK_LIGHT);

  // Photo placeholder in pink area
  doc.circle(M + 36, 38, 34).fill("#e8b0c0");
  doc.circle(M + 36, 38, 32).fill("#f0c0d0");
  doc.font("Inter").fontSize(7).fillColor("#fff")
    .text("PHOTO", M + 20, 34, { width: 32, align: "center" });

  doc.font("NotoSerif-Bold").fontSize(24).fillColor(DARK)
    .text(d.fullName, M, 65, { width: PW * 0.38 });
  doc.font("Inter").fontSize(9).fillColor("#666")
    .text(d.targetRole.toUpperCase(), M, doc.y + 3, { width: PW * 0.38, characterSpacing: 0.8 });

  // Contact info as rounded pills on the right
  let cY = 22;
  const contacts = [d.email, d.phone, d.address, d.linkedin, d.website].filter(Boolean) as string[];
  const pillX = PW * 0.48;
  const pillW = PW * 0.48;
  for (const c of contacts) {
    doc.roundedRect(pillX, cY, pillW, 18, 4).fill("#f5f5f5");
    doc.font("Inter").fontSize(8).fillColor("#444")
      .text(c, pillX + 10, cY + 5, { width: pillW - 20 });
    cY += 23;
  }

  const ROW_START = Math.max(doc.y + 12, cY + 6);

  function heading(title: string): void {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(DARK).text(title, M, doc.y, { width: W });
    const lineY = doc.y + 2;
    doc.save().moveTo(M, lineY).lineTo(M + W, lineY)
      .strokeColor(PINK).lineWidth(1.2).stroke().restore();
    doc.y = lineY + 8;
  }

  doc.y = ROW_START + 10;

  if (d.summary) {
    heading("Summary");
    doc.font("Inter").fontSize(8.5).fillColor("#333")
      .text(d.summary, M, doc.y, { width: W, lineGap: 1.8 });
    doc.y += 16;
  }

  if (d.experience?.length) {
    heading("Experience");
    renderExperience(doc, d.experience, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 8;
  }

  if (d.education?.length) {
    heading("Education");
    renderEducation(doc, d.education, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" });
    doc.y += 8;
  }

  if (d.skills?.length) {
    heading("Skills");
    renderSkillsPills(doc, d.skills, M, doc.y, W, PINK, "#ffffff");
    doc.y += 10;
  }

  if (d.projects?.length) {
    heading("Projects");
    renderProjects(doc, d.projects, M, W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
  }
}
