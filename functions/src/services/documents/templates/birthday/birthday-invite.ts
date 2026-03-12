// Bloom — pink/magenta, festive birthday invite
export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 56;
  const CW = W - M * 2;
  const PINK    = "#e91e8c";
  const MAGENTA = "#c2185b";
  const PURPLE  = "#6a1b9a";
  const LIGHT   = "#fce4ec";

  doc.rect(0, 0, W, H).fill(LIGHT);
  doc.rect(0, 0, W, 220).fill(PINK);
  doc.rect(0, 0, W, 4).fill(PURPLE);

  // Subtle decorative circles in header
  doc.save();
  doc.fillOpacity(0.1).circle(W - 40, 70, 90).fill("white");
  doc.circle(W + 10, 180, 60).fill("white");
  doc.restore();

  doc.fillColor("rgba(255,255,255,0.8)").font("Inter-SemiBold").fontSize(8)
     .text("H A P P Y  B I R T H D A Y", 0, 50, { width: W, align: "center", characterSpacing: 4 });

  doc.fillColor("white").font("NotoSerif-Bold").fontSize(36)
     .text(String(data.recipientName ?? ""), M, 80, { width: CW, align: "center" });

  doc.rect(0, 218, W, 5).fill(MAGENTA);

  if (data.birthdayMessage) {
    doc.fillColor("#880e4f").font("NotoSerif-Italic").fontSize(13)
       .text(String(data.birthdayMessage), M + 10, 256, { width: CW - 20, align: "center" });
  }

  // Dot row decoration
  const dotY = H - 148;
  [PINK, PURPLE, MAGENTA, PINK, PURPLE].forEach((c, i) => {
    doc.circle(W / 2 - 32 + i * 16, dotY, i === 2 ? 4 : 3).fill(c);
  });

  doc.rect(0, H - 80, W, 80).fill(PINK);
  doc.fillColor("rgba(255,255,255,0.9)").font("Inter").fontSize(9)
     .text("Wishing you a day as wonderful as you are", 0, H - 52, { width: W, align: "center" });
  doc.fillColor("white").font("NotoSerif-Italic").fontSize(11)
     .text("With love", 0, H - 35, { width: W, align: "center" });
}
