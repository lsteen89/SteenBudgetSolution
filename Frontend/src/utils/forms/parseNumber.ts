export function parseSvNumber(value: unknown): number | null {
    if (value === "" || value === null || value === undefined) return null;

    if (typeof value === "number") return Number.isFinite(value) ? value : NaN;

    if (typeof value !== "string") return NaN;

    const raw = value.trim();
    if (raw === "") return null;

    // NOTE: no negatives for money fields -> remove '-' if you want strict
    if (!/^[0-9\s.,]+$/.test(raw)) return NaN;

    const normalized = raw.replace(/\s+/g, "").replace(",", ".");
    const n = Number(normalized);

    return Number.isFinite(n) ? n : NaN;
}

export const setValueAsSvNumber = (v: unknown) => parseSvNumber(v);

// alias for consistency in older code
export const setValueAsNullableNumber = (v: unknown) => parseSvNumber(v);