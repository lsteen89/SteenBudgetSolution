import type { AppLocale } from "@/utils/i18n/locale";

export function normalizeI18nKey(raw: string) {
    return (raw ?? "")
        .trim()
        .replace(/[\s_-]+/g, "")
        .toLowerCase();
}

export function tDict(
    rawKey: string,
    locale: AppLocale,
    dict: { sv: Record<string, string>; en: Record<string, string> },
    opts?: { normalize?: boolean; fallback?: string }
) {
    const key = opts?.normalize ? normalizeI18nKey(rawKey) : (rawKey ?? "").trim();
    const table = locale.startsWith("sv") ? dict.sv : dict.en;

    const hit = table[key];
    if (hit) return hit;

    /*  Warn about missing keys in development mode */
    /*
    if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] Missing label for "${rawKey}" (normalized="${key}")`);
    }
    */
    return opts?.fallback ?? rawKey;
}
