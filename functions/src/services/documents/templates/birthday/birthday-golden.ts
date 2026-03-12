// Golden Hour — cream & gold, elegant birthday invite
export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 60;
  const CW = W - M * 2;
  const GOLD  = "#b8860b";
  const AMBER = "#d4a017";
  const CREAM = "#fdf8f0";
  const DARK  = "#2c2519";

  doc.rect(0, 0, W, H).fill(CREAM);

  // Double border frame
  doc.rect(16, 16, W - 32, H - 32).stroke().strokeColor(GOLD).lineWidth(1);
  doc.rect(22, 22, W - 44, H - 44).stroke().strokeColor(GOLD).lineWidth(0.3);

  // Top ornament
  const orn = (y: number) => {
    doc.moveTo(M + 20, y).lineTo(W / 2 - 18, y).strokeColor(GOLD).lineWidth(0.7).stroke();
    doc.circle(W / 2, y, 3).fill(GOLD);
    doc.moveTo(W / 2 + 18, y).lineTo(M + CW - 20, y).strokeColor(GOLD).lineWidth(0.7).stroke();
  };

  orn(68);

  doc.fillColor(GOLD).font("Inter-SemiBold").fontSize(8)
     .text("H A P P Y  B I R T H D A Y", 0, 82, { width: W, align: "center", characterSpacing: 3.5 });

  doc.fillColor(DARK).font("NotoSerif-Bold").fontSize(38)
     .text(String(data.recipientName ?? ""), M, 108, { width: CW, align: "center" });

  orn(180);

  if (data.birthdayMessage) {
    doc.fillColor("#6b5b35").font("NotoSerif-Italic").fontSize(13)
       .text(String(data.birthdayMessage), M + 30, 210, { width: CW - 60, align: "center" });
  }

  orn(H - 80);

  doc.fillColor(AMBER).font("NotoSerif-Italic").fontSize(11)
     .text("With warmest wishes on your special day", 0, H - 62, { width: W, align: "center" });
}
