export type Frequency = "Weekly" | "BiWeekly" | "Monthly" | "Quarterly" | "Yearly";

export function calcYearly(amount?: number | null, frequency?: Frequency | null) {
    const a = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;

    switch (frequency) {
        case "Weekly": return a * 52;
        case "BiWeekly": return a * 26;
        case "Quarterly": return a * 4;
        case "Yearly": return a;
        case "Monthly":
        default: return a * 12;
    }
}
