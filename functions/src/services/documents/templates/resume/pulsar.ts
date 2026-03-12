import {
  PW, PH, pageBreak, hr, parseResumeData, getPrimaryColor,
  renderExperience, renderEducation, renderSkillsPills, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const BG = getPrimaryColor(d, "#f0f7da");
  const M = 48;
  const W = PW - M * 2;

  function fillBg(): void {
    doc.rect(0, 0, PW, PH).fill(BG);
  }
  fillBg();
  doc.on("pageAdded", fillBg);

  const NAME_W = Math.round(W * 0.55);
  const COL_GAP = 0;
  const CONTACT_W = W - NAME_W - COL_GAP;
  const DX = M + NAME_W + COL_GAP;

  doc.font("Inter-Bold").fontSize(26).fillColor("#111111")
    .text(d.fullName, M, 40, { width: NAME_W });
  doc.font("Inter").fontSize(10).fillColor("#555555")
    .text(d.targetRole, M, doc.y + 2, { width: NAME_W });

  let dY = 44;
  const contactItems: { label: string; value: string }[] = [];
  if (d.phone) contactItems.push({ label: "Phone", value: d.phone });
  if (d.email) contactItems.push({ label: "Email", value: d.email });
  if (d.address) contactItems.push({ label: "Location", value: d.address });
  if (d.linkedin) contactItems.push({ label: "LinkedIn", value: d.linkedin });

  doc.font("Inter-SemiBold").fontSize(7.5).fillColor("#777");
  for (const { label, value } of contactItems) {
    const labelStr = label + ": ";
    const labelW = doc.widthOfString(labelStr);
    doc.text(labelStr, DX, dY, { continued: true });
    doc.font("Inter").fontSize(8).fillColor("#333")
      .text(value, { width: CONTACT_W - labelW });
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor("#777");
    dY = doc.y + 2;
  }

  let y = Math.max(doc.y + 4, dY);
  hr(doc, M, y, W, "#bbb", 0.5);
  y += 6;
  doc.y = y;

  if (d.summary) {
    pageBreak(doc, 999);
    doc.font("Inter-SemiBold").fontSize(10).fillColor("#2d5016").text("Summary", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, "#2d5016", 0.8);
    doc.y += 4;
    doc.font("Inter").fontSize(8.5).fillColor("#333")
      .text(d.summary, M, doc.y, { width: W, lineGap: 1.5 });
    doc.y += 8;
  }

  if (d.experience?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor("#2d5016").text("Experience", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, "#2d5016", 0.8);
    doc.y += 4;
    renderExperience(doc, d.experience, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" });
    doc.y += 4;
  }

  if (d.education?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor("#2d5016").text("Education", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, "#2d5016", 0.8);
    doc.y += 4;
    renderEducation(doc, d.education, M, W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" });
    doc.y += 4;
  }

  if (d.skills?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor("#2d5016").text("Skills", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, "#2d5016", 0.8);
    doc.y += 4;
    renderSkillsPills(doc, d.skills, M, doc.y, W, "#2d5016");
    doc.y += 6;
  }

  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor("#2d5016").text("Projects", M, doc.y, { width: W });
    hr(doc, M, doc.y + 2, W, "#2d5016", 0.8);
    doc.y += 4;
    renderProjects(doc, d.projects, M, W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" });
  }
}
