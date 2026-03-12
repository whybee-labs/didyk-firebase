import {
  PW, pageBreak, hr, parseResumeData, getPrimaryColor,
  renderExperience, renderEducation, renderSkillsPills, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const NAVY = getPrimaryColor(d, "#1a2744");
  const M = 48;
  const W = PW - M * 2;

  // ── Bordered name box, centered ──
  const boxW = 280;
  const boxX = (PW - boxW) / 2;
  const nameStr = d.fullName.toUpperCase();
  doc.font("Inter-Bold").fontSize(18).fillColor(NAVY);
  const nameH = doc.heightOfString(nameStr, { width: boxW - 24 });
  const boxH = nameH + 30;
  doc.rect(boxX, 24, boxW, boxH).lineWidth(1.5).strokeColor(NAVY).stroke();
  doc.text(nameStr, boxX + 12, 32, { width: boxW - 24, align: "center", characterSpacing: 1.5 });
  doc.font("Inter").fontSize(9).fillColor("#555")
    .text(d.targetRole, boxX + 12, doc.y + 3, { width: boxW - 24, align: "center" });

  const belowBox = 24 + boxH + 14;

  const contacts = [d.email, d.phone, d.address, d.linkedin].filter(Boolean) as string[];
  if (contacts.length) {
    doc.font("Inter").fontSize(8).fillColor("#666")
      .text(contacts.join("   |   "), M, belowBox, { width: W, align: "center" });
  }

  let y = doc.y + 14;
  hr(doc, M, y, W, NAVY, 0.8);
  y += 16;

  // ── Row: Summary (left ~60%) + Details (right ~38%) ──
  const COL_GAP = 22;
  const LEFT_W = Math.round(W * 0.58);
  const RIGHT_X = M + LEFT_W + COL_GAP;
  const RIGHT_W = W - LEFT_W - COL_GAP;

  let leftY = y;
  if (d.summary) {
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY)
      .text("SUMMARY", M, leftY, { width: LEFT_W });
    hr(doc, M, doc.y + 2, LEFT_W, NAVY, 0.6);
    leftY = doc.y + 8;
    doc.font("Inter").fontSize(8.5).fillColor("#333")
      .text(d.summary, M, leftY, { width: LEFT_W, lineGap: 1.8 });
    leftY = doc.y + 6;
  }

  let rightY = y;
  const detailPairs: { label: string; value: string }[] = [];
  if (d.address) detailPairs.push({ label: "Address", value: d.address });
  if (d.phone) detailPairs.push({ label: "Phone", value: d.phone });
  if (d.email) detailPairs.push({ label: "Email", value: d.email });
  if (d.linkedin) detailPairs.push({ label: "LinkedIn", value: d.linkedin });
  if (d.website) detailPairs.push({ label: "Website", value: d.website });

  if (detailPairs.length) {
    doc.font("Inter-SemiBold").fontSize(8).fillColor(NAVY)
      .text("DETAILS", RIGHT_X, rightY, { width: RIGHT_W, characterSpacing: 1.2 });
    hr(doc, RIGHT_X, doc.y + 2, RIGHT_W, "#ccc", 0.4);
    rightY = doc.y + 7;
    for (const { label, value } of detailPairs) {
      doc.font("Inter-SemiBold").fontSize(7).fillColor("#888")
        .text(label.toUpperCase(), RIGHT_X, rightY, { width: RIGHT_W });
      rightY = doc.y + 1;
      doc.font("Inter").fontSize(8).fillColor("#333")
        .text(value, RIGHT_X, rightY, { width: RIGHT_W });
      rightY = doc.y + 5;
    }
  }

  // ── Skills: full-width pills below the row ──
  const belowRow = Math.max(leftY, rightY) + 10;
  doc.y = belowRow;

  if (d.skills?.length) {
    doc.font("Inter-SemiBold").fontSize(8).fillColor(NAVY)
      .text("SKILLS", M, doc.y, { width: W, characterSpacing: 1.2 });
    hr(doc, M, doc.y + 2, W, "#ccc", 0.4);
    doc.y += 7;
    renderSkillsPills(doc, d.skills, M, doc.y, W, NAVY);
    doc.y += 6;
  }

  // ── Full-width sections ──
  if (d.experience?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY).text("EXPERIENCE", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, NAVY, 0.6);
    doc.y += 8;
    renderExperience(doc, d.experience, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 8;
  }

  if (d.education?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY).text("EDUCATION", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, NAVY, 0.6);
    doc.y += 8;
    renderEducation(doc, d.education, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" });
    doc.y += 8;
  }

  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY).text("PROJECTS", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, NAVY, 0.6);
    doc.y += 8;
    renderProjects(doc, d.projects, M, W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
  }
}
