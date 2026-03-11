export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W      = doc.page.width;
  const M      = 50;
  const CW     = W - M * 2;
  const ACCENT = "#1565c0";

  // Bold header
  doc.rect(0, 0, W, 110).fill(ACCENT);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(9)
     .text("SPECIAL OFFER", M, 28, { width: CW, align: "center", characterSpacing: 4 });
  doc.font("Helvetica-Bold").fontSize(24)
     .text(String(data.businessName ?? ""), M, 48, { width: CW, align: "center" });

  // Divider
  doc.moveTo(M, 128).lineTo(M + CW, 128).strokeColor("#bbdefb").lineWidth(1.5).stroke();

  // Promo description
  doc.font("Helvetica").fontSize(13).fillColor("#1a1a1a")
     .text(String(data.description ?? ""), M, 148, { width: CW, align: "center" });

  // CTA strip
  const ctaY = doc.page.height - 80;
  doc.rect(0, ctaY, W, 80).fill(ACCENT);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(12)
     .text("Contact us today!", M, ctaY + 28, { width: CW, align: "center" });
}
