import type { DebtItem, DebtsFormValues } from "@/types/Wizard/Step4_Debt/DebtFormValues";

export type DebtFromForm = DebtsFormValues["debts"][number];

export function safeNum(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

export function monthlyPayment(d: DebtFromForm): number {
  const P = safeNum(d.balance);
  if (P <= 0) return 0;

  const fee = safeNum(d.monthlyFee);

  if (d.type === "revolving") {
    const min = safeNum(d.minPayment);
    return (min > 0 ? min : 0) + fee;
  }

  const n = safeNum(d.termMonths);
  if (n <= 0) return fee;

  const apr = safeNum(d.apr);
  const r = apr <= 0 ? 0 : (apr / 100) / 12;

  const base =
    r === 0
      ? P / n
      : (P * r) / (1 - Math.pow(1 + r, -n));

  return safeNum(base) + fee;
}

export function isIncomplete(d: DebtFromForm): boolean {
  const P = safeNum(d.balance);
  if (P <= 0) return false;

  if (d.type === "revolving") return safeNum(d.minPayment) <= 0;

  return safeNum(d.termMonths) <= 0; // apr=0 is valid
}

export function rollupDebts(debts: DebtFromForm[]) {
  const totalBalance = debts.reduce((s, d) => s + safeNum(d.balance), 0);
  const estMonthlyTotal = debts.reduce((s, d) => s + monthlyPayment(d), 0);
  const incompleteCount = debts.reduce((c, d) => c + (isIncomplete(d) ? 1 : 0), 0);

  return { totalBalance, estMonthlyTotal, incompleteCount };
}
