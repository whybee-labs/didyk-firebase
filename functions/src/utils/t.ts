import translations from "config/translations.json";

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  let str: string = translations[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}
