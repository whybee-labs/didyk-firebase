// Ivory — cream & gold, classic wedding invitation
export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 60;
  const CW = W - M * 2;
  const GOLD  = "#b8860b";
  const IVORY = "#fdf9f0";
  const DARK  = "#2c1f0e";

  doc.rect(0, 0, W, H).fill(IVORY);
  doc.rect(16, 16, W - 32, H - 32).stroke().strokeColor(GOLD).lineWidth(0.8);
  doc.rect(22, 22, W - 44, H - 44).stroke().strokeColor(GOLD).lineWidth(0.3);

  const orn = (y: number) => {
    doc.moveTo(M + 10, y).lineTo(W / 2 - 82, y).strokeColor(GOLD).lineWidth(0.5).stroke();
    doc.fillColor(GOLD).font("Inter-SemiBold").fontSize(7)
       .text("WEDDING INVITATION", W / 2 - 74, y - 5, { width: 148, align: "center", characterSpacing: 1.5 });
    doc.moveTo(W / 2 + 82, y).lineTo(M + CW - 10, y).strokeColor(GOLD).lineWidth(0.5).stroke();
  };
  orn(68);

  // Couple names
  doc.fillColor(DARK).font("NotoSerif-Bold").fontSize(36)
     .text(String(data.coupleName ?? ""), M, 90, { width: CW, align: "center" });

  doc.fillColor("#7a6040").font("NotoSerif-Italic").fontSize(11)
     .text("request the pleasure of your company\nat the celebration of their marriage", M, 158, { width: CW, align: "center" });

  doc.moveTo(M + 40, 222).lineTo(M + CW - 40, 222).strokeColor(GOLD).lineWidth(0.4).stroke();

  let y = 246;
  const infoLine = (label: string, value: string) => {
    doc.fillColor(GOLD).font("Inter-SemiBold").fontSize(7)
       .text(label, 0, y, { width: W, align: "center", characterSpacing: 2 });
    y += 15;
    doc.fillColor(DARK).font("NotoSerif").fontSize(13)
       .text(value, M + 30, y, { width: CW - 60, align: "center" });
    y += 24;
    // Diamond divider
    doc.circle(W / 2, y + 5, 2.5).fill(GOLD);
    doc.moveTo(M + 50, y + 5).lineTo(W / 2 - 10, y + 5).strokeColor(GOLD).lineWidth(0.3).stroke();
    doc.moveTo(W / 2 + 10, y + 5).lineTo(M + CW - 50, y + 5).strokeColor(GOLD).lineWidth(0.3).stroke();
    y += 24;
  };

  if (data.weddingDate)       infoLine("DATE",       String(data.weddingDate));
  if (data.venue)             infoLine("VENUE",      String(data.venue));
  if (data.receptionDetails)  infoLine("RECEPTION",  String(data.receptionDetails));

  if (data.rsvpBy) {
    doc.fillColor("#7a6040").font("Inter").fontSize(9)
       .text(`RSVP by ${data.rsvpBy}`, 0, y + 8, { width: W, align: "center" });
  }

  // Bottom ornament
  doc.moveTo(M + 10, H - 78).lineTo(W / 2 - 18, H - 78).strokeColor(GOLD).lineWidth(0.6).stroke();
  doc.circle(W / 2, H - 78, 3).fill(GOLD);
  doc.moveTo(W / 2 + 18, H - 78).lineTo(M + CW - 10, H - 78).strokeColor(GOLD).lineWidth(0.6).stroke();

  doc.fillColor("#9a8060").font("NotoSerif-Italic").fontSize(9)
     .text(String(data.hostedBy ?? "Together with their families"), M, H - 60, { width: CW, align: "center" });
}
