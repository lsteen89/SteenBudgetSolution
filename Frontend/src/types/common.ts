export type Frequency =
    | "Weekly"
    | "BiWeekly"
    | "Monthly"
    | "Quarterly"
    | "Yearly"
    | "Other"
    | "Unknown";

export const VALID_FREQUENCIES: Frequency[] = [
    "Monthly",
    "Weekly",
    "Quarterly",
    "Yearly",
];