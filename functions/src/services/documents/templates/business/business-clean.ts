// Studio — white/teal, clean minimal business flyer
export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 60;
  const CW = W - M * 2;
  const TEAL = "#0d9488";
  const DARK = "#111827";
  const GRAY = "#6b7280";

  doc.rect(0, 0, W, H).fill("white");
  doc.rect(0, 0, 5, H).fill(TEAL);
  doc.rect(0, 0, W, 2).fill(TEAL);

  // Business name — large, serif
  doc.fillColor(DARK).font("NotoSerif-Bold").fontSize(34)
     .text(String(data.businessName ?? ""), M, 72, { width: CW });

  doc.moveTo(M, 130).lineTo(M + CW, 130).strokeColor("#e5e7eb").lineWidth(1).stroke();

  doc.fillColor(TEAL).font("Inter-SemiBold").fontSize(8.5)
     .text("S P E C I A L  P R O M O T I O N", M, 150, { characterSpacing: 2 });

  // Promo description — prominent
  doc.fillColor(DARK).font("Inter").fontSize(15)
     .text(String(data.description ?? ""), M, 178, { width: CW });

  // CTA section
  const ruleY = H - 140;
  doc.moveTo(M, ruleY).lineTo(M + CW, ruleY).strokeColor("#e5e7eb").lineWidth(1).stroke();

  doc.fillColor(TEAL).font("Inter-Bold").fontSize(12)
     .text("Get in touch", M, ruleY + 24);
  doc.fillColor(GRAY).font("Inter").fontSize(9)
     .text("We'd love to hear from you", M, ruleY + 44);

  doc.rect(0, H - 32, W, 32).fill(TEAL);
}
