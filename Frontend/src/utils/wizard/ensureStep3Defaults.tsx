import { Step3FormValues } from "@/schemas/wizard/StepSavings/step3Schema";

/**
 * Ensures that a partial Step3FormValues object is returned as a complete
 * object with all properties defined, applying sensible defaults.
 *
 * @param src - A partial or undefined object matching the Step3FormValues structure.
 * @returns A complete Step3FormValues object with all defaults applied.
 */
export function ensureStep3Defaults(
  src: Partial<Step3FormValues> | undefined
): Step3FormValues {
  return {
    // For a required string, default to an empty string.
    savingHabit: src?.savingHabit ?? "",

    // For nullable numbers or strings, default to null.
    monthlySavings: src?.monthlySavings ?? null,
    savingMethods: src?.savingMethods ?? [],

    // For a nullable array of objects, default to an empty array.
    // Then, map over the source array to ensure each object within it also has defaults.
    goals:
      src?.goals?.map(g => ({
        id: g?.id ?? crypto.randomUUID(),
        name: g?.name ?? "",
        targetAmount: g?.targetAmount ?? null,
        targetDate: g?.targetDate ?? "",
        amountSaved: g?.amountSaved ?? null,
      })) ?? [],
  };
}