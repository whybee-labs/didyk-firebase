import {
  PW, pageBreak, hr, parseResumeData, getPrimaryColor,
  renderExperience, renderEducation, renderSkillsGrid, renderProjects,
  renderOptionalSections, contactUrl,
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

  const contacts = [d.email, d.phone, d.linkedin].filter(Boolean) as string[];
  if (contacts.length) {
    const cY = doc.y + 3;
    let cx = M;
    for (let i = 0; i < contacts.length; i++) {
      const link = contactUrl(contacts[i]);
      const tw = doc.font("Inter").fontSize(8).widthOfString(contacts[i]);
      const opts: Record<string, unknown> = { lineBreak: false, width: tw + 1 };
      if (link) { opts.link = link; opts.underline = true; }
      doc.font("Inter").fontSize(8).fillColor(textOnHeader)
        .text(contacts[i], cx, cY, opts);
      cx += tw;
      if (i < contacts.length - 1) {
        const sepW = doc.font("Inter").fontSize(8).widthOfString("  |  ");
        doc.fillColor(textOnHeader).text("  |  ", cx, cY, { lineBreak: false, width: sepW + 1 });
        cx += sepW;
      }
    }
    doc.y = cY + 12;
  }
  if (d.github || d.website || d.address) {
    const links = [d.github, d.website, d.address].filter(Boolean) as string[];
    const lY = doc.y + 2;
    let cx = M;
    for (let i = 0; i < links.length; i++) {
      const link = contactUrl(links[i]);
      const tw = doc.font("Inter").fontSize(8).widthOfString(links[i]);
      const opts: Record<string, unknown> = { lineBreak: false, width: tw + 1 };
      if (link) { opts.link = link; opts.underline = true; }
      doc.font("Inter").fontSize(8).fillColor(textOnHeader)
        .text(links[i], cx, lY, opts);
      cx += tw;
      if (i < links.length - 1) {
        const sepW = doc.font("Inter").fontSize(8).widthOfString("  |  ");
        doc.fillColor(textOnHeader).text("  |  ", cx, lY, { lineBreak: false, width: sepW + 1 });
        cx += sepW;
      }
    }
    doc.y = lY + 12;
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
    doc.y += 8;
  }

  renderOptionalSections(doc, d, M, W,
    (title) => { pageBreak(doc, 40); doc.font("Inter-SemiBold").fontSize(11).fillColor(headerBg).text(title, M, doc.y, { width: W }); hr(doc, M, doc.y + 2, W, headerBg, 1); doc.y += 8; },
    { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
    { title: "#111", body: "#333", meta: "#666", bullet: "#444" },
    headerBg);
}
