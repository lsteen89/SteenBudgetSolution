import { DebtsFormValues } from "@/types/Wizard/debtFormValues";

export const ensureStep4Defaults = (
  src: Partial<DebtsFormValues> | undefined
): DebtsFormValues => ({
  intro: { hasDebts: src?.intro?.hasDebts ?? null },
  info : { notes:    src?.info ?.notes    ?? ""   },
  debts: (src?.debts ?? []).map(d => ({
    id:             d?.id             ?? crypto.randomUUID(),
    name:           d?.name           ?? "",
    principal:      d?.principal      ?? null,
    interestRate:   d?.interestRate   ?? null,
    termMonths:     d?.termMonths     ?? null,
    monthlyPayment: d?.monthlyPayment ?? null,
  })),
});