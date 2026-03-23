/**
 * Serves the template preview gallery and generates PDFs on demand with optional primaryColor.
 * Run from functions/: node lib/scripts/servePreview.js
 * Open http://localhost:4174
 */
import fs from "fs";
import path from "path";
import http from "http";
import url from "url";
import PDFDocument from "pdfkit";
import { resumeTemplates, templateRegistry } from "services/documents/templateRegistry";
import { registerFonts, SAMPLE_DATA } from "./previewResume";
import { INVITE_TEMPLATES } from "./previewInvites";

const PORT = 4174;
const PREVIEW_DIR = path.join(process.cwd(), "preview");

import { RESUME_COLOR_CONFIG as SHARED_CONFIG, textColorForBackground } from "config/resumeColors";

// Map shared config to preview format (mode + colors with hex & label)
const RESUME_COLOR_CONFIG: Record<string, { mode: "background" | "text"; colors: { hex: string; label: string }[] }> = {};
for (const [key, cfg] of Object.entries(SHARED_CONFIG)) {
  RESUME_COLOR_CONFIG[key] = { mode: cfg.mode, colors: cfg.colors.map((c) => ({ hex: c.hex, label: c.label })) };
}

// Invite templates: no colour picking (empty array → client falls back to static PDF)
const INVITE_DATA: Record<string, Record<string, unknown>> = Object.fromEntries(
  INVITE_TEMPLATES.map((t) => [t.key, t.data]),
);

// Combined map for /templates: resume get { mode, colors }; invites get []
const TEMPLATE_COLORS: Record<string, { mode: "background" | "text"; colors: { hex: string; label: string }[] } | string[]> = {
  ...RESUME_COLOR_CONFIG,
  ...Object.fromEntries(INVITE_TEMPLATES.map((t) => [t.key, [] as string[]])),
};

function generatePdfBuffer(
  templateKey: string,
  colorHex: string,
): Promise<{ buffer: Buffer; timeMs: number }> {
  const isInvite = templateKey in INVITE_DATA;
  const renderFn = isInvite
    ? templateRegistry[templateKey]
    : resumeTemplates[templateKey]?.render;
  if (!renderFn) return Promise.reject(new Error(`Unknown template: ${templateKey}`));

  let data: Record<string, unknown>;
  if (isInvite) {
    data = INVITE_DATA[templateKey];
  } else {
    const config = RESUME_COLOR_CONFIG[templateKey];
    const mode = config?.mode ?? "text";
    if (mode === "background") {
      const backgroundColor = colorHex.startsWith("#") ? colorHex : `#${colorHex}`;
      const primaryColor = textColorForBackground(backgroundColor);
      data = { ...SAMPLE_DATA, backgroundColor, primaryColor };
    } else {
      data = { ...SAMPLE_DATA, primaryColor: colorHex.startsWith("#") ? colorHex : `#${colorHex}` };
    }
  }

  const start = Date.now();
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  registerFonts(doc);
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  renderFn(doc, data);
  doc.end();

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve({ buffer: Buffer.concat(chunks), timeMs: Date.now() - start }));
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
    const isInvite = template && template in INVITE_DATA;
    if (!template || (!isInvite && !/^[0-9A-Fa-f]{6}$/.test(color))) {
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
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(
      `\nPort ${PORT} is in use. Free it then run npm run preview:serve again.\n` +
        `  Mac/Linux:  lsof -ti :${PORT} | xargs kill -9\n` +
        `  Windows:    netstat -ano | findstr :${PORT}   (find PID in last column)\n` +
        `              taskkill /F /PID <PID>\n`
    );
    process.exit(1);
  }
  throw err;
});
