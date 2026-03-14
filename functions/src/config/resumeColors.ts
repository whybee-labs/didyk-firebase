/**
 * Shared resume template colour config: bg-mode vs text-mode, with labels for WhatsApp lists.
 * Used by: servePreview (preview gallery), conversation flow (colour selection after template pick).
 */

export type ResumeColorMode = "background" | "text";

export interface ResumeColorOption {
  id: string;
  label: string;
  hex: string;
}

export interface ResumeColorConfig {
  mode: ResumeColorMode;
  colors: ResumeColorOption[];
}

function opt(id: string, label: string, hex: string): ResumeColorOption {
  return { id, label, hex };
}

/** Template key (e.g. pulsar, astralis) -> colour config with labels. */
export const RESUME_COLOR_CONFIG: Record<string, ResumeColorConfig> = {
  pulsar: {
    mode: "background",
    colors: [
      opt("bg1", "Pale green", "#e8f5e9"),
      opt("bg2", "Pink", "#ffb3ba"),
      opt("bg3", "Mint", "#b5ead7"),
      opt("bg4", "Sky blue", "#c7ceea"),
      opt("bg5", "Cream", "#fff4e6"),
    ],
  },
  comet: {
    mode: "background",
    colors: [
      opt("bg1", "Yellow", "#fdd835"),
      opt("bg2", "Orange", "#e67e22"),
      opt("bg3", "Coral", "#ff8a80"),
      opt("bg4", "Mint", "#b5ead7"),
      opt("bg5", "Lavender", "#c5cae9"),
    ],
  },
  nebula: {
    mode: "background",
    colors: [
      opt("bg1", "Navy", "#1a2744"),
      opt("bg2", "Dark blue", "#0d2137"),
      opt("bg3", "Indigo", "#1a237e"),
      opt("bg4", "Teal", "#004d40"),
      opt("bg5", "Purple", "#4a148c"),
    ],
  },
  celestial: {
    mode: "background",
    colors: [
      opt("bg1", "Navy", "#1a2744"),
      opt("bg2", "Dark blue", "#0d2137"),
      opt("bg3", "Indigo", "#1a237e"),
      opt("bg4", "Teal", "#004d40"),
      opt("bg5", "Purple", "#4a148c"),
    ],
  },
  aurora: {
    mode: "background",
    colors: [
      opt("bg1", "Blush", "#fce4ec"),
      opt("bg2", "Pink", "#ffb3ba"),
      opt("bg3", "Mint", "#b5ead7"),
      opt("bg4", "Sky", "#c7ceea"),
      opt("bg5", "Cream", "#fff8e1"),
    ],
  },
  cosmos: {
    mode: "background",
    colors: [
      opt("bg1", "Charcoal", "#2c2c2c"),
      opt("bg2", "Navy", "#1a2744"),
      opt("bg3", "Green", "#1b5e20"),
      opt("bg4", "Purple", "#4a148c"),
      opt("bg5", "Blue", "#0d47a1"),
    ],
  },
  astralis: { mode: "text", colors: [opt("t1", "Green", "#2d6a4f"), opt("t2", "Navy", "#1a2744"), opt("t3", "Rose", "#d4637a")] },
  eclipse: { mode: "text", colors: [opt("t1", "Black", "#1a1a1a"), opt("t2", "Navy", "#1a2744"), opt("t3", "Green", "#2d6a4f")] },
  galaxy: { mode: "text", colors: [opt("t1", "Navy", "#1a2744"), opt("t2", "Green", "#2d6a4f"), opt("t3", "Purple", "#7b1fa2")] },
  astral: { mode: "text", colors: [opt("t1", "Navy", "#1a2744"), opt("t2", "Gold", "#c9a96e"), opt("t3", "Green", "#2d6a4f")] },
  lunar: { mode: "text", colors: [opt("t1", "Navy", "#1a2744"), opt("t2", "Green", "#2d6a4f"), opt("t3", "Purple", "#7b1fa2")] },
  solstice: { mode: "text", colors: [opt("t1", "Black", "#1a1a1a"), opt("t2", "Navy", "#1a2744"), opt("t3", "Green", "#2d6a4f")] },
  ats: { mode: "text", colors: [opt("t1", "Navy", "#1a2744"), opt("t2", "Green", "#2d6a4f"), opt("t3", "Red", "#c0392b")] },
};

/** Get template key from use case id (e.g. uc-resume-pulsar -> pulsar). */
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
