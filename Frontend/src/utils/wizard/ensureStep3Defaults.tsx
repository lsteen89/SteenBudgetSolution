import { SavingsFormValues } from "@/types/Wizard/SavingsFormValues";

/* 1️⃣ helper — converts both Date and ISO-string to "YYYY-MM-DD" */
const toYMD = (d?: string | Date | null) =>
  d ? (typeof d === "string" ? d.split("T")[0] : d.toISOString().split("T")[0]) : "";

export function ensureStep3Defaults(
  src: Partial<SavingsFormValues> | undefined
): SavingsFormValues {
  const goals = (src?.goals || []).map(g => ({
    id: g?.id ?? crypto.randomUUID(),
    name: g?.name ?? "",
    targetAmount: g?.targetAmount ?? null,
    targetDate: toYMD(g?.targetDate),   
    amountSaved: g?.amountSaved ?? null,
  }));

  return {
    intro: {
      savingHabit: src?.intro?.savingHabit ?? "",
    },
    habits: {
      monthlySavings: src?.habits?.monthlySavings ?? null,
      savingMethods: src?.habits?.savingMethods ?? [],
    },
    goals,
  } as SavingsFormValues;
}
