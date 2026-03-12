import {
  PW, PH, pageBreak, hr, parseResumeData, getPrimaryColor,
  renderExperience, renderSkillsList, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const NAVY = getPrimaryColor(d, "#1a2744");
  const SIDEBAR_BG = "#f0f2f5";
  const SIDEBAR_W = Math.round(PW * 0.35);
  const SX = 18;
  const SW = SIDEBAR_W - 36;
  const MAIN_X = SIDEBAR_W + 22;
  const MAIN_W = PW - MAIN_X - 38;

  const contacts = [d.email, d.phone, d.address, d.linkedin].filter(Boolean) as string[];
  const NAVY_H = 126 + contacts.length * 14 + 10;

  doc.rect(0, 0, SIDEBAR_W, PH).fill(SIDEBAR_BG);
  doc.rect(0, 0, SIDEBAR_W, NAVY_H).fill(NAVY);
  doc.on("pageAdded", () => { doc.rect(0, 0, SIDEBAR_W, PH).fill(SIDEBAR_BG); });

  const photoX = SIDEBAR_W / 2;
  doc.circle(photoX, 48, 28).fill("#2a3d5c");
  doc.font("Inter").fontSize(7).fillColor("#8899aa")
    .text("PHOTO", photoX - 16, 44, { width: 32, align: "center" });

  doc.font("Inter-Bold").fontSize(16).fillColor("#ffffff")
    .text(d.fullName, SX, 84, { width: SW });
  doc.font("Inter").fontSize(9).fillColor("#b0bec5")
    .text(d.targetRole, SX, doc.y + 3, { width: SW });

  let sY = doc.y + 10;
  for (const c of contacts) {
    doc.font("Inter").fontSize(7.5).fillColor("#cfd8dc").text(c, SX, sY, { width: SW });
    sY = doc.y + 3;
  }

  // ── Sidebar: Education + Skills on grey area ──
  sY = NAVY_H + 14;
  if (d.education?.length) {
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor(NAVY)
      .text("EDUCATION", SX, sY, { width: SW, characterSpacing: 1.2 });
    hr(doc, SX, doc.y + 2, SW, "#ccc", 0.4);
    sY = doc.y + 7;
    for (const ed of d.education) {
      doc.font("Inter-SemiBold").fontSize(8.5).fillColor("#222")
        .text(ed.degree, SX, sY, { width: SW });
      const meta = [ed.school, ed.location].filter(Boolean).join(", ");
      doc.font("Inter").fontSize(7.5).fillColor("#666")
        .text(meta, SX, doc.y + 1, { width: SW });
      const yr = [ed.startYear, ed.endYear].filter(Boolean).join(" – ");
      if (yr) doc.font("Inter-Italic").fontSize(7.5).fillColor("#888")
        .text(yr, SX, doc.y + 1, { width: SW });
      if (ed.details) doc.font("Inter").fontSize(7.5).fillColor("#555")
        .text(ed.details, SX, doc.y + 1, { width: SW });
      sY = doc.y + 10;
    }
    sY += 6;
  }

  if (d.skills?.length) {
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor(NAVY)
      .text("SKILLS", SX, sY, { width: SW, characterSpacing: 1.2 });
    hr(doc, SX, doc.y + 2, SW, "#ccc", 0.4);
    sY = doc.y + 7;
    doc.y = sY;
    renderSkillsList(doc, d.skills, SX, SW, "Inter", "#333");
  }

  // ── Main column flows independently ──
  let mY = 28;

  if (d.summary) {
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY)
      .text("SUMMARY", MAIN_X, mY, { width: MAIN_W, characterSpacing: 1 });
    hr(doc, MAIN_X, doc.y + 3, MAIN_W, NAVY, 0.6);
    doc.y += 9;
    doc.font("Inter").fontSize(8.5).fillColor("#333")
      .text(d.summary, MAIN_X, doc.y, { width: MAIN_W, lineGap: 1.8 });
    mY = doc.y + 16;
  }

  doc.y = mY;

  if (d.experience?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY)
      .text("EXPERIENCE", MAIN_X, doc.y, { width: MAIN_W, characterSpacing: 1 });
    hr(doc, MAIN_X, doc.y + 3, MAIN_W, NAVY, 0.6);
    doc.y += 9;
    renderExperience(doc, d.experience, MAIN_X, MAIN_W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 8;
  }

  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY)
      .text("PROJECTS", MAIN_X, doc.y, { width: MAIN_W, characterSpacing: 1 });
    hr(doc, MAIN_X, doc.y + 3, MAIN_W, NAVY, 0.6);
    doc.y += 9;
    renderProjects(doc, d.projects, MAIN_X, MAIN_W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
  }
}
