// Rose — blush pink, romantic engagement invite
export function render(doc: PDFKit.PDFDocument, data: Record<string, unknown>): void {
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 56;
  const CW = W - M * 2;
  const ROSE  = "#c2185b";
  const DEEP  = "#880e4f";
  const BLUSH = "#fce4ec";
  const DARK  = "#2c1018";

  doc.rect(0, 0, W, H).fill(BLUSH);
  doc.rect(0, 0, W, 230).fill(ROSE);
  doc.rect(0, 0, W, 4).fill(DEEP);

  // Subtle circles
  doc.save();
  doc.fillOpacity(0.08).circle(W - 30, 80, 90).fill("white");
  doc.circle(W + 10, 200, 60).fill("white");
  doc.restore();

  doc.fillColor("rgba(255,255,255,0.8)").font("Inter-SemiBold").fontSize(7.5)
     .text("E N G A G E M E N T  C E L E B R A T I O N", 0, 54, { width: W, align: "center", characterSpacing: 2.5 });

  doc.fillColor("white").font("NotoSerif-Bold").fontSize(34)
     .text(String(data.coupleName ?? ""), M, 84, { width: CW, align: "center" });

  doc.fillColor("rgba(255,255,255,0.85)").font("NotoSerif-Italic").fontSize(13)
     .text("are getting engaged!", M, 148, { width: CW, align: "center" });

  doc.rect(0, 228, W, 4).fill(DEEP);

  let y = 278;
  const block = (label: string, value: string) => {
    doc.fillColor(ROSE).font("Inter-SemiBold").fontSize(7.5)
       .text(label, 0, y, { width: W, align: "center", characterSpacing: 2 });
    y += 16;
    doc.fillColor(DARK).font("Inter").fontSize(13)
       .text(value, M + 20, y, { width: CW - 40, align: "center" });
    y += 26;
    doc.circle(W / 2, y + 4, 3).fill(ROSE);
    y += 24;
  };

  if (data.date)  block("D A T E", String(data.date));
  if (data.venue) block("V E N U E", String(data.venue));

  if (data.note) {
    doc.fillColor(DEEP).font("NotoSerif-Italic").fontSize(11)
       .text(String(data.note), M + 20, y + 10, { width: CW - 40, align: "center" });
  }

  doc.rect(0, H - 72, W, 72).fill(ROSE);
  if (data.hostedBy) {
    doc.fillColor("rgba(255,255,255,0.85)").font("Inter").fontSize(8.5)
       .text(`Hosted by ${data.hostedBy}`, 0, H - 50, { width: W, align: "center" });
  }
  doc.fillColor("white").font("NotoSerif-Italic").fontSize(10)
     .text("Join us in celebrating our love", 0, H - 34, { width: W, align: "center" });
}
