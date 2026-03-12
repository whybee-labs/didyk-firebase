/**
 * Serves the resume preview gallery and generates PDFs on demand with optional primaryColor.
 * Run from functions/: node lib/scripts/servePreview.js
 * Open http://localhost:4174
 */
import fs from "fs";
import path from "path";
import http from "http";
import url from "url";
import PDFDocument from "pdfkit";
import { resumeTemplates } from "services/documents/templateRegistry";
import { registerFonts, SAMPLE_DATA } from "./previewResume";

const PORT = 4174;
const PREVIEW_DIR = path.join(process.cwd(), "preview");

const TEMPLATE_COLORS: Record<string, [string, string, string]> = {
  astralis:  ["#2d6a4f", "#1a2744", "#d4637a"],
  pulsar:    ["#f0f7da", "#fef9e7", "#fce4ec"],
  eclipse:   ["#1a1a1a", "#1a2744", "#2d6a4f"],
  comet:     ["#fdd835", "#2d6a4f", "#d4637a"],
  nebula:    ["#1a2744", "#2d6a4f", "#7b1fa2"],
  cosmos:    ["#e67e22", "#1a2744", "#2d6a4f"],
  celestial: ["#1a2744", "#2d6a4f", "#c0392b"],
  galaxy:    ["#1a2744", "#2d6a4f", "#7b1fa2"],
  astral:    ["#1a2744", "#c9a96e", "#2d6a4f"],
  lunar:     ["#1a2744", "#2d6a4f", "#7b1fa2"],
  aurora:    ["#d4637a", "#2d6a4f", "#1a2744"],
  solstice:  ["#1a1a1a", "#1a2744", "#2d6a4f"],
  ats:       ["#1a2744", "#2d6a4f", "#c0392b"],
};

function generatePdfBuffer(
  templateKey: string,
  primaryColor: string,
): Promise<{ buffer: Buffer; timeMs: number }> {
  const meta = resumeTemplates[templateKey];
  if (!meta) return Promise.reject(new Error(`Unknown template: ${templateKey}`));

  const start = Date.now();
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  registerFonts(doc);
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const data = { ...SAMPLE_DATA, primaryColor } as Record<string, unknown>;
  meta.render(doc, data);
  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => {
      const timeMs = Date.now() - start;
      resolve({ buffer: Buffer.concat(chunks), timeMs });
    });
    doc.on("error", reject);
  });
}

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".pdf":  "application/pdf",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
};

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url ?? "", true);
  const pathname = parsed.pathname ?? "/";
  const query = parsed.query;

  if (pathname === "/templates" && req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(TEMPLATE_COLORS));
    return;
  }

  if (pathname === "/generate" && req.method === "GET") {
    const template = query.template as string;
    const color = (query.color as string)?.replace(/^#/, "") ?? "";
    if (!template || !/^[0-9A-Fa-f]{6}$/.test(color)) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain");
      res.end("Missing or invalid template or color (use 6-digit hex without #)");
      return;
    }
    try {
      const { buffer, timeMs } = await generatePdfBuffer(template, `#${color}`);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("X-Generation-Time-Ms", String(timeMs));
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end(buffer);
    } catch (e) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain");
      res.end(String(e));
    }
    return;
  }

  let filePath = path.join(PREVIEW_DIR, pathname === "/" ? "index.html" : pathname);
  if (!pathname.includes(".")) filePath = path.join(PREVIEW_DIR, "index.html");
  if (!filePath.startsWith(PREVIEW_DIR)) {
    res.statusCode = 403;
    res.end();
    return;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.end();
    return;
  }
  const ext = path.extname(filePath);
  res.setHeader("Content-Type", mime[ext] ?? "application/octet-stream");
  res.end(fs.readFileSync(filePath));
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Preview server: http://localhost:${PORT}`);
});
