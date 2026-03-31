import sharp from "sharp";
import { PREVIEW_POLICY } from "config/previewPolicy";

const WATERMARK_TEXT = "whybee";

function buildWatermarkSvg(width: number, height: number): Buffer {
  const fontSize = Math.max(20, Math.round(Math.min(width, height) * 0.065));
  const tileW = Math.round(width * 0.6);
  const tileH = Math.round(height * 0.35);

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="wm" x="0" y="0" width="${tileW}" height="${tileH}"
                 patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
          <text x="0" y="${fontSize}" font-size="${fontSize}"
                fill="rgba(255,255,255,0.35)" font-family="sans-serif"
                font-weight="bold" letter-spacing="6">
            ${WATERMARK_TEXT}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wm)"/>
    </svg>`;

  return Buffer.from(svg);
}

/**
 * Apply watermark and/or low-res downscale to an image buffer based on the active PREVIEW_POLICY.
 * Returns the original buffer unchanged if both policy flags are off.
 */
export async function preparePreview(buffer: Buffer): Promise<Buffer> {
  if (!PREVIEW_POLICY.watermark && !PREVIEW_POLICY.lowRes) return buffer;

  let img = sharp(buffer);

  if (PREVIEW_POLICY.lowRes) {
    const meta = await img.metadata();
    const newWidth = Math.round((meta.width ?? 1024) / 2);
    // Materialise the resize so we can read the new dimensions for the watermark
    img = sharp(await img.resize(newWidth).png().toBuffer());
  }

  if (PREVIEW_POLICY.watermark) {
    const meta = await img.metadata();
    const wmSvg = buildWatermarkSvg(meta.width ?? 1024, meta.height ?? 1024);
    img = img.composite([{ input: wmSvg, blend: "over" }]);
  }

  return img.png().toBuffer();
}
