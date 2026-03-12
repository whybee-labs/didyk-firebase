// Modern — indigo/violet, contemporary event invite
export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 56;
  const CW = W - M * 2;
  const INDIGO = "#4338ca";
  const VIOLET = "#7c3aed";
  const DARK   = "#0f172a";
  const SLATE  = "#475569";

  doc.rect(0, 0, W, H).fill("white");
  doc.rect(0, 0, 6, H).fill(INDIGO);
  doc.rect(0, 0, W, 200).fill(INDIGO);
  doc.rect(0, 198, W, 6).fill(VIOLET);

  doc.fillColor("rgba(255,255,255,0.55)").font("Inter-SemiBold").fontSize(8)
     .text("I N V I T A T I O N", M, 48, { width: CW, align: "center", characterSpacing: 3 });

  doc.fillColor("white").font("Inter-Bold").fontSize(32)
     .text(String(data.eventName ?? "Event"), M, 80, { width: CW, align: "center" });

  let y = 248;
  const row = (label: string, value: string) => {
    doc.roundedRect(M, y, 3, 32, 1.5).fill(INDIGO);
    doc.fillColor(SLATE).font("Inter-SemiBold").fontSize(7.5)
       .text(label, M + 14, y + 3, { width: CW - 14, characterSpacing: 1.5 });
    doc.fillColor(DARK).font("Inter").fontSize(13)
       .text(value, M + 14, y + 16, { width: CW - 14 });
    y += 54;
  };

  if (data.dateTime) row("DATE & TIME", String(data.dateTime));
  if (data.venue)    row("VENUE",       String(data.venue));
  if (data.note)     row("NOTE",        String(data.note));

  doc.rect(0, H - 72, W, 72).fill(DARK);
  doc.fillColor(VIOLET).font("Inter-SemiBold").fontSize(9)
     .text("We can't wait to see you there", 0, H - 48, { width: W, align: "center" });
  doc.fillColor("#94a3b8").font("Inter").fontSize(8)
     .text("Your presence is the greatest gift", 0, H - 32, { width: W, align: "center" });
}
