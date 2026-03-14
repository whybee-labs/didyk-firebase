/**
 * PDF Generator — single adapter boundary.
 *
 * Everything outside calls generatePdf(data) and receives a public URL.
 * To swap implementation (e.g. to a third-party render service or a separate
 * microservice), replace only this file. The interface stays the same.
 *
 * data conventions:
 *   data._template       — template name (default: "astralis"). See templateRegistry.ts.
 *   data._watermark      — false to skip watermark (default: true, i.e. preview mode)
 *   data._phone          — used in Storage filename (e.g. "919876543210")
 *   data._conversationId — used in Storage filename (first 8 chars)
 *   data.photoUrl        — resume: URL of user's photo; we fetch and set _photoBuffer for templates.
 */

import path from "path";
import axios from "axios";
import PDFDocument from "pdfkit";
import { templateRegistry } from "services/documents/templateRegistry";
import { uploadFile } from "services/storage/uploadFile";

// ── Font paths (resolved relative to project root at runtime) ────────────────

function fontsDir(): string {
  return path.resolve(__dirname, "../../../fonts");
}

function registerFonts(doc: PDFKit.PDFDocument): void {
  const dir = fontsDir();
  doc.registerFont("Inter",         path.join(dir, "Inter-Regular.otf"));
  doc.registerFont("Inter-Medium",  path.join(dir, "Inter-Medium.otf"));
  doc.registerFont("Inter-SemiBold", path.join(dir, "Inter-SemiBold.otf"));
  doc.registerFont("Inter-Bold",    path.join(dir, "Inter-Bold.otf"));
  doc.registerFont("Inter-Italic",  path.join(dir, "Inter-Italic.otf"));
  doc.registerFont("NotoSerif",          path.join(dir, "NotoSerif-Regular.ttf"));
  doc.registerFont("NotoSerif-Bold",     path.join(dir, "NotoSerif-Bold.ttf"));
  doc.registerFont("NotoSerif-Italic",   path.join(dir, "NotoSerif-Italic.ttf"));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generatePdf(data: Record<string, unknown>): Promise<string> {
  const templateName = String(data._template ?? "astralis");
  const watermark    = data._watermark !== false;

  if (data.photoUrl && typeof data.photoUrl === "string") {
    try {
      const res = await axios.get(data.photoUrl, { responseType: "arraybuffer" });
      (data as Record<string, unknown>)._photoBuffer = Buffer.from(res.data as ArrayBuffer);
    } catch {
      // Leave _photoBuffer unset; templates will show placeholder
    }
  }

  const phone    = data._phone    ? String(data._phone).replace(/\D/g, "").slice(-10) : undefined;
  const cid      = data._conversationId ? String(data._conversationId).slice(0, 8)  : undefined;
  const suffix   = watermark ? "preview" : "final";
  const fileName = [phone, cid, suffix].filter(Boolean).join("-");

  const buffer = await renderPdf(data, templateName, watermark);
  return uploadFile(buffer, "application/pdf", "documents", fileName || undefined);
}

// ── Renderer ──────────────────────────────────────────────────────────────────

function renderPdf(
  data: Record<string, unknown>,
  templateName: string,
  watermark: boolean
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    registerFonts(doc);
    const chunks: Buffer[] = [];

    doc.on("data",  (c: Buffer) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const render = templateRegistry[templateName] ?? templateRegistry["astralis"];
    render(doc, data);

    if (watermark) {
      // Watermark only on first page (1- or 2-page resume)
      doc.switchToPage(0);
      renderWatermark(doc);
    }

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
     .text("WHYBEE", W / 2 - 80, H / 2 - 30, { lineBreak: false });
  doc.restore();
}
