import * as yup from "yup";


function parseSvNumberStrict(orig: unknown): number | null | typeof NaN {
    if (orig === "" || orig === null || orig === undefined) return null;

    if (typeof orig === "number") return Number.isFinite(orig) ? orig : NaN;

    if (typeof orig !== "string") return NaN;

    const raw = orig.trim();
    if (raw === "") return null;

    if (!/^-?[0-9\s.,]+$/.test(raw)) return NaN;

    const normalized = raw.replace(/\s+/g, "").replace(",", ".");
    const n = Number(normalized);

    return Number.isFinite(n) ? n : NaN;
}


type SvNumberOptions = {
    min?: number;              // default 0 (your wizard rule)
    typeError?: string;        // default "Måste vara ett nummer."
    minError?: string;         // default "Belopp kan inte vara negativt."
};

export const svNumberNullable = (opts: SvNumberOptions = {}) => {
    const {
        min = 0,
        typeError = "Måste vara ett nummer.",
        minError = "Belopp kan inte vara negativt.",
    } = opts;

    return yup
        .number()
        .nullable()
        .transform((_, orig) => parseSvNumberStrict(orig))
        .typeError(typeError)
        .test("finite", typeError, (v) => v === null || Number.isFinite(v))
        .min(min, minError);
};

// Money is just a naming + message wrapper right now.
// Keep it separate so you can later add max, fractionDigits policy, etc.
export const svMoneyNullable = (opts: SvNumberOptions = {}) =>
    svNumberNullable(opts);

// Your existing name helper is fine
export const nameNullable = yup
    .string()
    .transform((v) => (typeof v === "string" ? v.trim() : v))
    .nullable()
    .transform((v) => (v === "" ? null : v));
