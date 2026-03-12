// Midnight Luxe — dark & gold, dramatic wedding invitation
export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 56;
  const CW = W - M * 2;
  const MIDNIGHT = "#0c0c1e";
  const GOLD     = "#d4af7a";
  const MUTED    = "#c49a6c";

  doc.rect(0, 0, W, H).fill(MIDNIGHT);
  doc.rect(18, 18, W - 36, H - 36).stroke().strokeColor(GOLD).lineWidth(0.8);
  doc.rect(0, 0, W, 5).fill(GOLD);
  doc.rect(0, H - 5, W, 5).fill(GOLD);

  doc.fillColor(GOLD).font("Inter-SemiBold").fontSize(7.5)
     .text("— WEDDING INVITATION —", 0, 52, { width: W, align: "center", characterSpacing: 3 });

  doc.fillColor("white").font("NotoSerif-Bold").fontSize(34)
     .text(String(data.coupleName ?? ""), M, 80, { width: CW, align: "center" });

  doc.fillColor(GOLD).font("NotoSerif-Italic").fontSize(11)
     .text("together with their families\nrequest the pleasure of your company\nat the celebration of their marriage", M, 150, { width: CW, align: "center" });

  doc.moveTo(M + 30, 222).lineTo(M + CW - 30, 222).strokeColor(GOLD).lineWidth(0.4).stroke();

  let y = 246;
  const block = (label: string, value: string) => {
    doc.fillColor(GOLD).font("Inter-SemiBold").fontSize(7)
       .text(label, 0, y, { width: W, align: "center", characterSpacing: 2.5 });
    y += 16;
    doc.fillColor("#e8dcc8").font("NotoSerif").fontSize(13)
       .text(value, M + 20, y, { width: CW - 40, align: "center" });
    y += 32;
  };

  if (data.weddingDate)      block("DATE",      String(data.weddingDate));
  if (data.venue)            block("VENUE",     String(data.venue));
  if (data.receptionDetails) block("RECEPTION", String(data.receptionDetails));

  if (data.rsvpBy) {
    doc.fillColor(MUTED).font("Inter").fontSize(9)
       .text(`RSVP by ${data.rsvpBy}`, 0, y + 10, { width: W, align: "center" });
  } else {
    doc.fillColor(MUTED).font("NotoSerif-Italic").fontSize(10)
       .text("Your presence is our greatest gift", 0, y + 10, { width: W, align: "center" });
  }

  if (data.hostedBy) {
    doc.fillColor("#6b6b8a").font("Inter").fontSize(8.5)
       .text(String(data.hostedBy), 0, H - 40, { width: W, align: "center" });
  }
}
