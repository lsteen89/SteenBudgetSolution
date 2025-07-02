import { DebtsFormValues, DebtItem } from "@/types/Wizard/DebtFormValues"; 

export const ensureStep4Defaults = (
  src: Partial<DebtsFormValues> | undefined
): DebtsFormValues => ({
  intro: { hasDebts: src?.intro?.hasDebts ?? null },
  info:  { notes:    src?.info?.notes     ?? ""   },
  // --- This is the fix ---
  debts: (src?.debts ?? []).map((d: Partial<DebtItem> | undefined) => ({
    id:           d?.id           ?? crypto.randomUUID(),
    name:         d?.name         ?? "",
    type:         d?.type         ?? "installment", // Default to 'installment'
    balance:      d?.balance      ?? null, // USE 'balance'
    apr:          d?.apr          ?? null, // USE 'apr'
    minPayment:   d?.minPayment   ?? null, // USE 'minPayment'
    termMonths:   d?.termMonths   ?? null, // USE 'termMonths'
  })),
});