export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W      = doc.page.width;
  const M      = 60;
  const CW     = W - M * 2;
  const ACCENT = "#212121";

  // Dark header band
  doc.rect(0, 0, W, 130).fill(ACCENT);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(10)
     .text("YOU'RE INVITED", M, 32, { width: CW, align: "center", characterSpacing: 3 });
  doc.font("Helvetica-Bold").fontSize(26)
     .text(String(data.eventName ?? "Event"), M, 55, { width: CW, align: "center" });

  // Details
  let y = 158;
  const row = (icon: string, value: string) => {
    doc.font("Helvetica-Bold").fontSize(10).fillColor(ACCENT).text(icon, M, y, { continued: true });
    doc.font("Helvetica").fontSize(10).fillColor("#333").text(`  ${value}`, { width: CW });
    y = doc.y + 10;
  };

  if (data.dateTime) row("📅", String(data.dateTime));
  if (data.venue)    row("📍", String(data.venue));

  // Decorative bottom border
  doc.rect(M, y + 10, CW, 2).fill("#e0e0e0");
}
