import type { AppLocale } from "@/utils/i18n/locale";

export function normalizeI18nKey(raw: string) {
  return (raw ?? "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();
}

type Dict3 = {
  sv: Record<string, string>;
  en: Record<string, string>;
  et: Record<string, string>;
};

function tableFor(locale: AppLocale, dict: Dict3) {
  if (locale.startsWith("sv")) return dict.sv;
  if (locale.startsWith("et")) return dict.et;
  return dict.en;
}

export function tDict(
  rawKey: string,
  locale: AppLocale,
  dict: Dict3,
  opts?: { normalize?: boolean; fallback?: string },
) {
  const key = opts?.normalize
    ? normalizeI18nKey(rawKey)
    : (rawKey ?? "").trim();
  const table = tableFor(locale, dict);

  const hit = table[key];
  if (hit) return hit;

  return opts?.fallback ?? rawKey;
}
