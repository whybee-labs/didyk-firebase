/**
 * PDF Generator — single adapter boundary.
 *
 * Everything outside calls generatePdf(data) and receives a public URL.
 * To swap implementation (e.g. to a third-party render service or a separate
 * microservice), replace only this file. The interface stays the same.
 *
 * data conventions:
 *   data._template  — template name (default: "modern"). See templateRegistry.ts.
 *   data._watermark — false to skip watermark (default: true, i.e. preview mode)
 */

import PDFDocument from "pdfkit";
import { templateRegistry } from "services/documents/templateRegistry";
import { uploadFile } from "services/storage/uploadFile";

// ── Public API ────────────────────────────────────────────────────────────────

export async function generatePdf(data: Record<string, unknown>): Promise<string> {
  const templateName = String(data._template ?? "modern");
  const watermark    = data._watermark !== false; // default true (preview)

  const buffer = await renderPdf(data, templateName, watermark);
  return uploadFile(buffer, "application/pdf", "documents");
}

// ── Renderer ──────────────────────────────────────────────────────────────────

function renderPdf(
  data: Record<string, unknown>,
  templateName: string,
  watermark: boolean
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];

    doc.on("data",  (c: Buffer) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const render = templateRegistry[templateName] ?? templateRegistry["modern"];
    render(doc, data);

    if (watermark) renderWatermark(doc);

    doc.end();
  });
}

// ── Watermark ─────────────────────────────────────────────────────────────────

function renderWatermark(doc: PDFKit.PDFDocument): void {
  const W = doc.page.width;
  const H = doc.page.height;

  doc.save();
  doc.opacity(0.1);
  doc.rotate(-45, { origin: [W / 2, H / 2] });
  doc.font("Helvetica-Bold").fontSize(60).fillColor("#000")
     .text("WHYBEE PREVIEW", W / 2 - 220, H / 2 - 30, { lineBreak: false });
  doc.restore();
}
