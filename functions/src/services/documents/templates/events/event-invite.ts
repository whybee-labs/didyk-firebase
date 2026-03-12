// Midnight — navy & gold, formal event invite
export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 56;
  const CW = W - M * 2;
  const NAVY  = "#14213d";
  const GOLD  = "#c9a84c";
  const CREAM = "#fefdf9";

  doc.rect(0, 0, W, H).fill(CREAM);
  doc.rect(0, 0, W, 255).fill(NAVY);
  doc.rect(0, 0, W, 3).fill(GOLD);

  doc.fillColor(GOLD).font("Inter-SemiBold").fontSize(7.5)
     .text("— YOU'RE INVITED —", 0, 55, { width: W, align: "center", characterSpacing: 3 });
  doc.moveTo(W / 2 - 70, 71).lineTo(W / 2 + 70, 71).strokeColor(GOLD).lineWidth(0.4).stroke();

  doc.fillColor("white").font("NotoSerif-Bold").fontSize(30)
     .text(String(data.eventName ?? "Event"), M, 90, { width: CW, align: "center" });

  doc.rect(0, 252, W, 4).fill(GOLD);

  let y = 308;
  const block = (label: string, value: string) => {
    doc.fillColor(GOLD).font("Inter-SemiBold").fontSize(7)
       .text(label, 0, y, { width: W, align: "center", characterSpacing: 2.5 });
    y += 16;
    doc.fillColor(NAVY).font("Inter").fontSize(12)
       .text(value, M + 20, y, { width: CW - 40, align: "center" });
    y += 24;
    const sx = W / 2 - 28;
    for (let i = 0; i < 5; i++) doc.circle(sx + i * 14, y + 10, i === 2 ? 2.5 : 1.5).fill(GOLD);
    y += 34;
  };

  if (data.dateTime) block("D A T E  &  T I M E", String(data.dateTime));
  if (data.venue)    block("V E N U E",           String(data.venue));
  if (data.note)     block("N O T E",             String(data.note));

  doc.moveTo(M, H - 102).lineTo(M + CW, H - 102).strokeColor(GOLD).lineWidth(0.5).stroke();
  doc.moveTo(M, H - 97).lineTo(M + CW, H - 97).strokeColor(GOLD).lineWidth(0.5).stroke();

  doc.rect(0, H - 88, W, 88).fill(NAVY);
  doc.fillColor("#8899b5").font("Inter").fontSize(8.5)
     .text("We look forward to celebrating with you", 0, H - 58, { width: W, align: "center" });
  doc.fillColor(GOLD).font("NotoSerif-Italic").fontSize(10)
     .text("Kindly confirm your presence", 0, H - 40, { width: W, align: "center" });
}
