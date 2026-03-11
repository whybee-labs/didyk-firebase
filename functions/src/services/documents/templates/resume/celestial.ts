import {
  PW, PH, pageBreak, hr, parseResumeData,
  renderExperience, renderEducation, renderProjects,
} from "./helpers";

export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const d = parseResumeData(data);
  const NAVY = "#1a2744";
  const SIDEBAR_W = Math.round(PW * 0.34);
  const MAIN_X = SIDEBAR_W + 24;
  const MAIN_W = PW - MAIN_X - 40;

  // ── Draw sidebar on every page ──
  function drawSidebar(): void {
    doc.rect(0, 0, SIDEBAR_W, PH).fill(NAVY);
  }

  drawSidebar();

  // Sidebar: Photo placeholder
  const photoX = SIDEBAR_W / 2;
  doc.circle(photoX, 55, 32).fill("#2a3d5c");
  doc.circle(photoX, 55, 30).fill("#3a4d6c");
  doc.font("Inter").fontSize(7).fillColor("#8899aa")
    .text("PHOTO", photoX - 16, 50, { width: 32, align: "center" });

  // Sidebar: Name
  doc.font("Inter-Bold").fontSize(17).fillColor("#ffffff")
    .text(d.fullName, 18, 100, { width: SIDEBAR_W - 36 });

  // Sidebar: Role
  doc.font("Inter").fontSize(9).fillColor("#90a4ae")
    .text(d.targetRole, 18, doc.y + 4, { width: SIDEBAR_W - 36 });

  let sY = doc.y + 18;

  // Sidebar: Details
  const contacts = [d.email, d.phone, d.address, d.linkedin, d.website].filter(Boolean) as string[];
  if (contacts.length) {
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor("#7a8ea0")
      .text("DETAILS", 18, sY, { width: SIDEBAR_W - 36, characterSpacing: 1.5 });
    sY = doc.y + 6;
    for (const c of contacts) {
      doc.font("Inter").fontSize(8).fillColor("#cfd8dc")
        .text(c, 18, sY, { width: SIDEBAR_W - 36 });
      sY = doc.y + 4;
    }
    sY += 14;
  }

  // Sidebar: Skills
  if (d.skills?.length) {
    doc.font("Inter-SemiBold").fontSize(7.5).fillColor("#7a8ea0")
      .text("SKILLS", 18, sY, { width: SIDEBAR_W - 36, characterSpacing: 1.5 });
    sY = doc.y + 6;
    for (const sk of d.skills) {
      doc.font("Inter").fontSize(8).fillColor("#cfd8dc")
        .text(`•   ${sk}`, 18, sY, { width: SIDEBAR_W - 36 });
      sY = doc.y + 3;
    }
  }

  // ── Main area ──
  let y = 30;

  // Summary
  if (d.summary) {
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY)
      .text("SUMMARY", MAIN_X, y, { width: MAIN_W, characterSpacing: 1.2 });
    y = doc.y + 3;
    hr(doc, MAIN_X, y, MAIN_W, NAVY, 0.6);
    y += 8;
    doc.font("Inter").fontSize(8.5).fillColor("#333333")
      .text(d.summary, MAIN_X, y, { width: MAIN_W, lineGap: 1.8 });
    y = doc.y + 18;
  }

  // Experience
  if (d.experience?.length) {
    doc.y = y;
    pageBreak(doc, 40);
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY)
      .text("EXPERIENCE", MAIN_X, doc.y, { width: MAIN_W, characterSpacing: 1.2 });
    hr(doc, MAIN_X, doc.y + 3, MAIN_W, NAVY, 0.6);
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
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY)
      .text("EDUCATION", MAIN_X, doc.y, { width: MAIN_W, characterSpacing: 1.2 });
    hr(doc, MAIN_X, doc.y + 3, MAIN_W, NAVY, 0.6);
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
    doc.font("Inter-SemiBold").fontSize(10).fillColor(NAVY)
      .text("PROJECTS", MAIN_X, doc.y, { width: MAIN_W, characterSpacing: 1.2 });
    hr(doc, MAIN_X, doc.y + 3, MAIN_W, NAVY, 0.6);
    doc.y += 10;
    renderProjects(doc, d.projects, MAIN_X, MAIN_W,
      { title: "Inter-SemiBold", body: "Inter", bullet: "Inter" },
      { title: "#111", body: "#444", bullet: "#444" },
    );
  }
}
