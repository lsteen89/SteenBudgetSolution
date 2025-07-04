import { DebtsFormValues, DebtItem } from "@/types/Wizard/DebtFormValues"; 

export const ensureStep4Defaults = (
  src: Partial<DebtsFormValues> | undefined
): DebtsFormValues => ({
  

  intro: { hasDebts: src?.intro?.hasDebts ?? null },

  summary: {
    repaymentStrategy: src?.summary?.repaymentStrategy ?? "noAction",
  },

  debts: (src?.debts ?? []).map((d: Partial<DebtItem> | undefined) => ({
    id:          d?.id          ?? crypto.randomUUID(),
    name:        d?.name        ?? "",
    type:        d?.type        ?? "bank_loan",
    balance:     d?.balance     ?? null,
    apr:         d?.apr         ?? null,
    monthlyFee:  d?.monthlyFee  ?? null,
    minPayment:  d?.minPayment  ?? null,
    termMonths:  d?.termMonths  ?? null,
  })),
});