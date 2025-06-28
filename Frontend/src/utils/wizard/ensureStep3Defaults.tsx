import { SavingsFormValues } from '@/types/Wizard/SavingsFormValues';

/**
 * Ensures that a partial SavingsFormValues object is returned as a complete
 * object with all properties defined, applying sensible defaults.
 *
 * @param src - A partial or undefined object matching the SavingsFormValues structure.
 * @returns A complete SavingsFormValues object with all defaults applied.
 */
export function ensureStep3Defaults(
  src: Partial<SavingsFormValues> | undefined
): SavingsFormValues {
  return {
    intro: {
      savingHabit: src?.intro?.savingHabit ?? "",
    },
    habits: {
      monthlySavings: src?.habits?.monthlySavings ?? null,
      savingMethods: src?.habits?.savingMethods ?? [],
    },
    goals:
      src?.goals?.map(g => ({
        id: g?.id ?? crypto.randomUUID(),
        name: g?.name ?? "",
        amount: g?.amount ?? null,
        targetDate: g?.targetDate ?? undefined,
        amountSaved: g?.amountSaved ?? null,
      })) ?? [],
  };
}