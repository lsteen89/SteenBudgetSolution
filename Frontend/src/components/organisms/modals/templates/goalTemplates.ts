import type { GoalTemplate } from "@/types/modal/savings";

const toYMD = (d: Date) => d.toISOString().slice(0, 10);

const getFutureDate = (yearsToAdd: number): string => {
    const today = new Date();
    today.setFullYear(today.getFullYear() + yearsToAdd);
    return toYMD(today);
};

export const goalTemplates: GoalTemplate[] = [
    { name: "Resa till solen", targetAmount: 25_000, targetDate: getFutureDate(1) },
    { name: "Buffert", targetAmount: 50_000, targetDate: getFutureDate(2) },
    { name: "Ny bil", targetAmount: 75_000, targetDate: getFutureDate(3) },
    { name: "Kontantinsats", targetAmount: 150_000, targetDate: getFutureDate(5) },
];
