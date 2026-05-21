// Plan-level savings method (storage vehicle) as returned by
// GET /api/budgets/months/{yearMonth}/savings-methods.
//
// `code` is a stable system code shared with the backend (see
// SavingsMethodCodes in the .NET codebase). For all system codes the UI
// resolves the user-visible label through i18n. `customLabel` is only
// populated when `code === "custom"` — the chip strip renders it verbatim
// for those rows.
//
// `id` is included so a future delete UI can target a specific row.

export const SAVINGS_METHOD_CODES = [
  "savings_account",
  "isk",
  "funds",
  "cash",
  "custom",
] as const;

export type SavingsMethodCode = (typeof SAVINGS_METHOD_CODES)[number];

export type SavingsMethodDto = {
  id: string;
  code: SavingsMethodCode;
  customLabel?: string | null;
};

export function isSavingsMethodCode(value: unknown): value is SavingsMethodCode {
  return (
    typeof value === "string" &&
    (SAVINGS_METHOD_CODES as readonly string[]).includes(value)
  );
}
