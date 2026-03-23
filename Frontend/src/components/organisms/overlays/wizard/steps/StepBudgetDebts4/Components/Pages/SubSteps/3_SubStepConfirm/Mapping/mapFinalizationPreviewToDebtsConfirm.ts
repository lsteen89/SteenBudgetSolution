import type {
  BudgetDashboardDto,
  DashboardDebtItemDto,
} from "@/types/budget/BudgetDashboardDto";
import type { RepaymentStrategy } from "@/types/Wizard/Step4_Debt/DebtFormValues";

function n(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

const clamp0 = (x: number) => (Number.isFinite(x) ? Math.max(0, x) : 0);

function monthlyInterest(balance: number, apr: number) {
  return (clamp0(balance) * (clamp0(apr) / 100)) / 12;
}

function approxPayoffMonths(balance: number, monthlyPayment: number) {
  const principal = clamp0(balance);
  const payment = clamp0(monthlyPayment);
  if (principal <= 0 || payment <= 0) return null;
  return Math.ceil(principal / payment);
}

export type DebtsConfirmVm = {
  totalDebtBalance: number;
  totalMonthlyPayments: number;
  avgApr: number;
  repaymentStrategy: RepaymentStrategy;

  avalanche: {
    targetName: string;
    targetApr: number | null;
    monthlyInterestEstimate: number | null;
  };

  snowball: {
    targetName: string;
    targetBalance: number | null;
    payoffMonths: number | null;
  };
};

export function mapFinalizationPreviewToDebtsConfirm(
  preview: BudgetDashboardDto,
): DebtsConfirmVm {
  const debt = preview.debt;
  const items = (debt.debts ?? []) as DashboardDebtItemDto[];

  const repaymentStrategy = (debt as any).repaymentStrategy ?? null;

  const totalDebtBalance = n(debt.totalDebtBalance);
  const totalMonthlyPayments = n(debt.totalMonthlyPayments);

  const totalBalanceForWeight = items.reduce(
    (sum, debtItem) => sum + clamp0(n(debtItem.balance)),
    0,
  );

  const weightedAprSum = items.reduce(
    (sum, debtItem) =>
      sum + clamp0(n(debtItem.balance)) * clamp0(n(debtItem.apr)),
    0,
  );

  const avgApr =
    totalBalanceForWeight > 0 ? weightedAprSum / totalBalanceForWeight : 0;

  const highestAprDebt = items
    .filter((debtItem) => n(debtItem.balance) > 0)
    .slice()
    .sort((a, b) => n(b.apr) - n(a.apr))[0];

  const smallestBalanceDebt = items
    .filter((debtItem) => n(debtItem.balance) > 0)
    .slice()
    .sort((a, b) => n(a.balance) - n(b.balance))[0];

  return {
    totalDebtBalance,
    totalMonthlyPayments,
    avgApr,
    repaymentStrategy: repaymentStrategy as RepaymentStrategy,

    avalanche: {
      targetName: highestAprDebt?.name ?? "",
      targetApr: highestAprDebt ? clamp0(n(highestAprDebt.apr)) : null,
      monthlyInterestEstimate: highestAprDebt
        ? monthlyInterest(n(highestAprDebt.balance), n(highestAprDebt.apr))
        : null,
    },

    snowball: {
      targetName: smallestBalanceDebt?.name ?? "",
      targetBalance: smallestBalanceDebt
        ? clamp0(n(smallestBalanceDebt.balance))
        : null,
      payoffMonths: smallestBalanceDebt
        ? approxPayoffMonths(
            n(smallestBalanceDebt.balance),
            n(smallestBalanceDebt.monthlyPayment),
          )
        : null,
    },
  };
}
