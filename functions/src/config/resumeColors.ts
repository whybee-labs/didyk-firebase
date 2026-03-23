/**
 * Shared resume template colour config: bg-mode vs text-mode, with labels for WhatsApp lists.
 * Used by: servePreview (preview gallery), conversation flow (colour selection after template pick).
 */

export type ResumeColorMode = "background" | "text";

export interface ResumeColorOption {
  id: string;
  label: string;
  hex: string;
  tag?: "Popular" | "Unique";
}

export interface ResumeColorConfig {
  mode: ResumeColorMode;
  colors: ResumeColorOption[];
}

function opt(id: string, label: string, hex: string, tag?: "Popular" | "Unique"): ResumeColorOption {
  const o: ResumeColorOption = { id, label, hex };
  if (tag) o.tag = tag;
  return o;
}

/** Template key (planet name) -> colour config with labels. */
export const RESUME_COLOR_CONFIG: Record<string, ResumeColorConfig> = {
  earth: {
    mode: "background",
    colors: [
      opt("bg1", "Pale green", "#e8f5e9", "Popular"),
      opt("bg2", "Pink", "#ffb3ba"),
      opt("bg3", "Mint", "#b5ead7"),
      opt("bg4", "Sky blue", "#c7ceea", "Unique"),
      opt("bg5", "Cream", "#fff4e6"),
    ],
  },
  mars: {
    mode: "background",
    colors: [
      opt("bg1", "Lavender", "#e8dff0", "Popular"),
      opt("bg2", "Blush", "#fce4ec"),
      opt("bg3", "Mint", "#e0f2f1"),
      opt("bg4", "Sky", "#e3f2fd", "Unique"),
      opt("bg5", "Cream", "#fff8e1"),
    ],
  },
  saturn: {
    mode: "background",
    colors: [
      opt("bg1", "Navy", "#1a2744", "Popular"),
      opt("bg2", "Charcoal", "#2d3436"),
      opt("bg3", "Forest", "#1b4332"),
      opt("bg4", "Slate", "#334155"),
      opt("bg5", "Burgundy", "#4a1942", "Unique"),
    ],
  },
  venus: {
    mode: "background",
    colors: [
      opt("bg1", "Blush", "#fce4ec"),
      opt("bg2", "Pink", "#ffb3ba"),
      opt("bg3", "Mint", "#b5ead7", "Popular"),
      opt("bg4", "Sky", "#c7ceea", "Unique"),
      opt("bg5", "Cream", "#fff8e1"),
    ],
  },
  uranus:  { mode: "text", colors: [opt("t1", "Green", "#2d6a4f", "Unique"), opt("t2", "Navy", "#1a2744"), opt("t3", "Rose", "#d4637a", "Popular")] },
  pluto:   { mode: "text", colors: [opt("t1", "Black", "#1a1a1a", "Popular"), opt("t2", "Navy", "#1a2744"), opt("t3", "Green", "#2d6a4f", "Unique")] },
  jupiter: { mode: "text", colors: [opt("t1", "Navy", "#1a2744", "Popular"), opt("t2", "Green", "#2d6a4f"), opt("t3", "Purple", "#7b1fa2", "Unique")] },
  neptune: { mode: "text", colors: [opt("t1", "Navy", "#1a2744", "Popular"), opt("t2", "Green", "#2d6a4f"), opt("t3", "Purple", "#7b1fa2", "Unique")] },
  mercury: { mode: "text", colors: [opt("t1", "Navy", "#1a2744", "Popular"), opt("t2", "Green", "#2d6a4f", "Unique"), opt("t3", "Red", "#c0392b")] },
};

/** Get template key from use case id (e.g. uc-resume-earth -> earth). */
export function templateKeyFromUseCaseId(ucId: string): string {
  return ucId.replace(/^uc-resume-/, "");
}

export function getResumeColorConfig(templateKey: string): ResumeColorConfig | null {
  return RESUME_COLOR_CONFIG[templateKey] ?? null;
}

/** Relative luminance (0–1). Used to pick text color on background. */
export function luminance(hex: string): number {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const [rs, gs, bs] = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function textColorForBackground(bgHex: string): string {
  return luminance(bgHex) > 0.4 ? "#1a1a1a" : "#f5f5f5";
}

/** Resolve selected colour option id to hex; returns hex for primaryColor or backgroundColor. */
export function hexForColorOptionId(templateKey: string, optionId: string): string | null {
  const config = RESUME_COLOR_CONFIG[templateKey];
  if (!config) return null;
  const opt = config.colors.find((c) => c.id === optionId);
  return opt?.hex ?? null;
}
