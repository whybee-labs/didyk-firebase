// Impact — navy/cyan, bold business flyer
export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 52;
  const CW = W - M * 2;
  const NAVY = "#0f2044";
  const BLUE = "#1565c0";
  const CYAN = "#00b4d8";

  // Dark header fills top 58%
  doc.rect(0, 0, W, H * 0.58).fill(NAVY);
  doc.rect(0, H * 0.58, W, H * 0.42).fill("#f8f9fa");
  doc.rect(0, H * 0.58 - 4, W, 4).fill(CYAN);

  // Eyebrow
  doc.fillColor(CYAN).font("Inter-SemiBold").fontSize(8)
     .text("S P E C I A L  O F F E R", 0, 52, { width: W, align: "center", characterSpacing: 3 });
  doc.moveTo(W / 2 - 60, 67).lineTo(W / 2 + 60, 67).strokeColor(CYAN).lineWidth(0.5).stroke();

  // Business name
  doc.fillColor("white").font("Inter-Bold").fontSize(32)
     .text(String(data.businessName ?? ""), M, 86, { width: CW, align: "center" });

  // Thin rule
  doc.moveTo(M + 40, 160).lineTo(M + CW - 40, 160).strokeColor("#1e3a5f").lineWidth(1).stroke();

  // Promo description
  doc.fillColor("#90caf9").font("Inter").fontSize(14)
     .text(String(data.description ?? ""), M + 10, 178, { width: CW - 20, align: "center" });

  // CTA box
  const ctaY = H * 0.58 + 48;
  doc.roundedRect(M, ctaY, CW, 52, 4).fill(BLUE);
  doc.fillColor("white").font("Inter-Bold").fontSize(13)
     .text("Contact us today", M, ctaY + 18, { width: CW, align: "center" });

  // Footnote
  doc.fillColor("#9ca3af").font("Inter").fontSize(9)
     .text("Limited time offer — don't miss out", M, ctaY + 88, { width: CW, align: "center" });
}
