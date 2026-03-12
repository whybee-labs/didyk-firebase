// Vivid — dark/multicolor, bold party invite
export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 50;
  const CW = W - M * 2;
  const PURPLE = "#5c35d4";
  const VIOLET = "#8b5cf6";
  const ORANGE = "#f59e0b";
  const DARK   = "#0f0a1e";

  doc.rect(0, 0, W, H).fill(DARK);

  // Tri-color top stripe
  doc.rect(0, 0, W / 3, 6).fill(PURPLE);
  doc.rect(W / 3, 0, W / 3, 6).fill(ORANGE);
  doc.rect((W / 3) * 2, 0, W / 3, 6).fill(VIOLET);

  doc.fillColor(ORANGE).font("Inter-Bold").fontSize(9)
     .text("L E T ' S  P A R T Y", 0, 44, { width: W, align: "center", characterSpacing: 4 });

  doc.fillColor("white").font("Inter-Bold").fontSize(30)
     .text(String(data.eventTitle ?? "Party Time!"), M, 72, { width: CW, align: "center" });

  doc.rect(0, 158, W, 5).fill(PURPLE);

  let y = 196;
  const row = (label: string, value: string, accent: string) => {
    doc.rect(M, y, 4, 30).fill(accent);
    doc.fillColor(accent).font("Inter-SemiBold").fontSize(7.5)
       .text(label, M + 14, y + 2, { characterSpacing: 1.5 });
    doc.fillColor("white").font("Inter").fontSize(12)
       .text(value, M + 14, y + 14, { width: CW - 14 });
    y += 48;
  };

  if (data.date)      row("DATE",       String(data.date),      ORANGE);
  if (data.venue)     row("VENUE",      String(data.venue),     VIOLET);
  if (data.dressCode) row("DRESS CODE", String(data.dressCode), ORANGE);
  if (data.note)      row("NOTE",       String(data.note),      VIOLET);

  // Tri-color bottom stripe
  doc.rect(0, H - 6, W / 3, 6).fill(PURPLE);
  doc.rect(W / 3, H - 6, W / 3, 6).fill(ORANGE);
  doc.rect((W / 3) * 2, H - 6, W / 3, 6).fill(VIOLET);

  doc.rect(0, H - 76, W, 70).fill("#1a0f3e");
  if (data.hostedBy) {
    doc.fillColor("#a78bfa").font("Inter").fontSize(8.5)
       .text(`Hosted by ${data.hostedBy}`, 0, H - 58, { width: W, align: "center" });
  }
  doc.fillColor(ORANGE).font("Inter-Bold").fontSize(11)
     .text("Can't wait to celebrate with you!", 0, H - 40, { width: W, align: "center" });
}
