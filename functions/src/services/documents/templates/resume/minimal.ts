export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const M = 55;
  const W = doc.page.width - M * 2;

  // Name + role
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#000")
     .text(String(data.fullName ?? ""), M, 55, { width: W, align: "center" });
  doc.font("Helvetica").fontSize(12).fillColor("#555")
     .text(String(data.targetRole ?? ""), M, 84, { width: W, align: "center" });

  // Divider
  doc.moveTo(M, 108).lineTo(M + W, 108).strokeColor("#ccc").lineWidth(1).stroke();

  // Sections
  const sections = [
    { title: "EDUCATION",  body: String(data.education ?? "") },
    { title: "SKILLS",     body: String(data.skills ?? "") },
    ...(data.experience ? [{ title: "EXPERIENCE", body: String(data.experience) }] : []),
    ...(data.projects   ? [{ title: "PROJECTS",   body: String(data.projects)   }] : []),
  ];

  let y = 122;
  for (const s of sections) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#000").text(s.title, M, y, { width: W });
    y = doc.y + 4;
    doc.font("Helvetica").fontSize(10).fillColor("#333").text(s.body, M, y, { width: W });
    y = doc.y + 16;
  }
}
