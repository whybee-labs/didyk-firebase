import {
  PW, PH, pageBreak, hr, parseResumeData, getPrimaryColor,
  renderExperience, renderEducation, renderProjects,
  renderOptionalSections, renderContactItem,
} from "./helpers";

const DEFAULT_SIDEBAR_BG = "#1a2744";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const sidebarBg = (data.backgroundColor as string) && /^#[0-9A-Fa-f]{6}$/.test(String(data.backgroundColor).trim())
    ? String(data.backgroundColor).trim() : DEFAULT_SIDEBAR_BG;
  const textOnSidebar = getPrimaryColor(d, "#ffffff");
  const SIDEBAR_W = Math.round(PW * 0.34);
  const MAIN_X = SIDEBAR_W + 24;
  const MAIN_W = PW - MAIN_X - 40;

  function drawSidebar(): void {
    doc.rect(0, 0, SIDEBAR_W, PH).fill(sidebarBg);
  }

  drawSidebar();

  doc.font("Inter-Bold").fontSize(17).fillColor(textOnSidebar)
    .text(d.fullName, 18, 28, { width: SIDEBAR_W - 36 });

  doc.font("Inter").fontSize(9).fillColor(textOnSidebar)
    .text(d.targetRole, 18, doc.y + 4, { width: SIDEBAR_W - 36 });

  let sY = doc.y + 18;

  // Sidebar: Details
  const contacts = [d.email, d.phone, d.linkedin, d.github, d.website, d.address].filter(Boolean) as string[];
  if (contacts.length) {
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor(textOnSidebar)
      .text("DETAILS", 18, sY, { width: SIDEBAR_W - 36, characterSpacing: 1.5 });
    sY = doc.y + 6;
    for (const c of contacts) {
      renderContactItem(doc, c, 18, sY, SIDEBAR_W - 36, "Inter", 8, textOnSidebar);
      sY = doc.y + 4;
    }
    sY += 14;
  }

  // Sidebar: Skills
  if (d.skills?.length) {
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor(textOnSidebar)
      .text("SKILLS", 18, sY, { width: SIDEBAR_W - 36, characterSpacing: 1.5 });
    sY = doc.y + 6;
    for (const sk of d.skills) {
      doc.font("Inter").fontSize(8).fillColor(textOnSidebar)
        .text(`•   ${sk}`, 18, sY, { width: SIDEBAR_W - 36 });
      sY = doc.y + 3;
    }
    sY += 12;
  }

  // Sidebar: Languages
  if (d.languages?.length) {
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor(textOnSidebar)
      .text("LANGUAGES", 18, sY, { width: SIDEBAR_W - 36, characterSpacing: 1.5 });
    sY = doc.y + 6;
    for (const lang of d.languages) {
      const label = lang.proficiency ? `${lang.language} — ${lang.proficiency}` : lang.language;
      doc.font("Inter").fontSize(8).fillColor(textOnSidebar)
        .text(`•   ${label}`, 18, sY, { width: SIDEBAR_W - 36 });
      sY = doc.y + 3;
    }
    sY += 12;
  }

  // Sidebar: Interests
  if (d.interests?.length) {
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor(textOnSidebar)
      .text("INTERESTS", 18, sY, { width: SIDEBAR_W - 36, characterSpacing: 1.5 });
    sY = doc.y + 6;
    for (const item of d.interests) {
      doc.font("Inter").fontSize(8).fillColor(textOnSidebar)
        .text(`•   ${item}`, 18, sY, { width: SIDEBAR_W - 36 });
      sY = doc.y + 3;
    }
    sY += 12;
  }

  // Sidebar: Causes
  if (d.causes?.length) {
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor(textOnSidebar)
      .text("CAUSES", 18, sY, { width: SIDEBAR_W - 36, characterSpacing: 1.5 });
    sY = doc.y + 6;
    for (const item of d.causes) {
      doc.font("Inter").fontSize(8).fillColor(textOnSidebar)
        .text(`•   ${item}`, 18, sY, { width: SIDEBAR_W - 36 });
      sY = doc.y + 3;
    }
  }

  // ── Main area ──
  let y = 30;

  // Summary
  if (d.summary) {
    doc.font("Inter-SemiBold").fontSize(10).fillColor(sidebarBg)
      .text("SUMMARY", MAIN_X, y, { width: MAIN_W, characterSpacing: 1.2 });
    y = doc.y + 3;
    hr(doc, MAIN_X, y, MAIN_W, sidebarBg, 0.6);
    y += 8;
    doc.font("Inter").fontSize(8.5).fillColor("#333333")
      .text(d.summary, MAIN_X, y, { width: MAIN_W, lineGap: 1.8 });
    y = doc.y + 18;
  }

  // Experience
  if (d.experience?.length) {
    doc.y = y;
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(sidebarBg)
      .text("EXPERIENCE", MAIN_X, doc.y, { width: MAIN_W, characterSpacing: 1.2 });
    hr(doc, MAIN_X, doc.y + 3, MAIN_W, sidebarBg, 0.6);
    doc.y += 10;
    renderExperience(doc, d.experience, MAIN_X, MAIN_W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
      { title: "#111", meta: "#666", body: "#333", bullet: "#444" },
    );
    doc.y += 8;
  }

  // Education
  if (d.education?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(sidebarBg)
      .text("EDUCATION", MAIN_X, doc.y, { width: MAIN_W, characterSpacing: 1.2 });
    hr(doc, MAIN_X, doc.y + 3, MAIN_W, sidebarBg, 0.6);
    doc.y += 10;
    renderEducation(doc, d.education, MAIN_X, MAIN_W,
      { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic" },
      { title: "#111", meta: "#666", body: "#555" },
    );
    doc.y += 8;
  }

  // Projects
  if (d.projects?.length) {
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(sidebarBg)
      .text("PROJECTS", MAIN_X, doc.y, { width: MAIN_W, characterSpacing: 1.2 });
    hr(doc, MAIN_X, doc.y + 3, MAIN_W, sidebarBg, 0.6);
    doc.y += 10;
    renderProjects(doc, d.projects, MAIN_X, MAIN_W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" },
    );
    doc.y += 8;
  }

  renderOptionalSections(doc, d, MAIN_X, MAIN_W,
    (title) => { pageBreak(doc, 40); doc.font("Inter-SemiBold").fontSize(10).fillColor(sidebarBg).text(title.toUpperCase(), MAIN_X, doc.y, { width: MAIN_W, characterSpacing: 1.2 }); hr(doc, MAIN_X, doc.y + 3, MAIN_W, sidebarBg, 0.6); doc.y += 10; },
    { title: "Inter-SemiBold", body: "Inter", meta: "Inter-Italic", bullet: "Inter" },
    { title: "#111", body: "#333", meta: "#666", bullet: "#444" },
    sidebarBg, "#ffffff",
    ["languages", "interests", "causes"]);
}
