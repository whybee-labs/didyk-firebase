export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W      = doc.page.width;
  const M      = 60;
  const CW     = W - M * 2;
  const ACCENT = "#e91e8c";

  // Pink header
  doc.rect(0, 0, W, 120).fill(ACCENT);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(11)
     .text("🎉  CELEBRATING", M, 28, { width: CW, align: "center", characterSpacing: 2 });
  doc.font("Helvetica-Bold").fontSize(28)
     .text(String(data.recipientName ?? ""), M, 52, { width: CW, align: "center" });

  // Message
  if (data.birthdayMessage) {
    doc.font("Helvetica").fontSize(12).fillColor("#333")
       .text(String(data.birthdayMessage), M, 148, { width: CW, align: "center" });
  }

  // Decorative footer
  const footerY = doc.page.height - 60;
  doc.rect(0, footerY, W, 60).fill(ACCENT);
  doc.fillColor("white").font("Helvetica").fontSize(10)
     .text("With love 🎂", M, footerY + 22, { width: CW, align: "center" });
}
