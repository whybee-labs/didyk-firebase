export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W       = doc.page.width;
  const SIDEBAR = Math.round(W * 0.32);
  const MAIN_X  = SIDEBAR + 24;
  const MAIN_W  = W - SIDEBAR - 44;
  const ACCENT  = "#1a237e";

  // Header
  doc.rect(0, 0, W, 90).fill(ACCENT);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(20)
     .text(String(data.fullName ?? ""), 20, 22, { width: W - 40 });
  doc.font("Helvetica").fontSize(11)
     .text(String(data.targetRole ?? ""), 20, 50, { width: W - 40 });

  // Sidebar background
  doc.rect(0, 90, SIDEBAR, doc.page.height - 90).fill("#f0f0f0");

  // Sidebar: Skills
  let sY = 112;
  doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(8).text("SKILLS", 14, sY);
  sY += 14;
  doc.fillColor("#333").font("Helvetica").fontSize(9)
     .text(String(data.skills ?? ""), 14, sY, { width: SIDEBAR - 24 });
  sY = doc.y + 18;

  // Sidebar: Education
  doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(8).text("EDUCATION", 14, sY);
  sY += 14;
  doc.fillColor("#333").font("Helvetica").fontSize(9)
     .text(String(data.education ?? ""), 14, sY, { width: SIDEBAR - 24 });

  // Main: Experience
  let mY = 110;
  if (data.experience) {
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(9)
       .text("EXPERIENCE", MAIN_X, mY, { width: MAIN_W });
    mY += 14;
    doc.fillColor("#333").font("Helvetica").fontSize(10)
       .text(String(data.experience), MAIN_X, mY, { width: MAIN_W });
    mY = doc.y + 18;
  }

  // Main: Projects
  if (data.projects) {
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(9)
       .text("PROJECTS", MAIN_X, mY, { width: MAIN_W });
    mY += 14;
    doc.fillColor("#333").font("Helvetica").fontSize(10)
       .text(String(data.projects), MAIN_X, mY, { width: MAIN_W });
  }
}
