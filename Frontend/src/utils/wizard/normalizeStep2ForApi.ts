import type { Step2FormValues } from "@/schemas/wizard/StepExpenditures/step2Schema";


const toNumberOrNaN = (v: unknown): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : NaN;

    const raw = String(v).trim();
    if (raw === "") return null;

    // only digits, spaces, comma, dot, minus
    if (!/^[0-9\s.,-]+$/.test(raw)) return NaN;

    const n = Number(raw.replace(/\s+/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
};

export function normalizeStep2ForApi(v: Step2FormValues): Step2FormValues {
    const rc = v.housing?.runningCosts;
    if (!rc) return v;

    return {
        ...v,
        housing: {
            ...v.housing,
            runningCosts: {
                ...rc,
                electricity: toNumberOrNaN(rc.electricity),
                heating: toNumberOrNaN(rc.heating),
                water: toNumberOrNaN(rc.water),
                waste: toNumberOrNaN(rc.waste),
                other: toNumberOrNaN(rc.other),
            },
        },
    };
}

