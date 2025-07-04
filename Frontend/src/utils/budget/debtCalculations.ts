import { DebtItem } from "@/types/Wizard/DebtFormValues";
import { amortize } from "./financialCalculations"; 

/**
 * Calculates the real monthly payment for any given debt item.
 */
const getMonthlyPayment = (d: DebtItem): number => {
  switch (d.type) {
    case "revolving":
      return d.minPayment ?? 0;
    case "bank_loan":
    case "installment":
      // The payment is the calculated amortization plus any fixed monthly fee.
      const amortization = amortize(d.balance ?? null, d.apr ?? null, d.termMonths ?? null);
      return (amortization ?? 0) + (d.monthlyFee ?? 0);
    case "private":
    default:
      return 0;
  }
};

/**
 * Roll-ups for the confirmation page, now with accurate calculations and grouping.
 */
export const summariseDebts = (debts: DebtItem[]) => {
  if (!debts || debts.length === 0) {
    // Return a more detailed default object
    return {
      total: 0,
      totalMonthlyPayment: 0,
      avgApr: 0,
      bankLoanDebts:    { items: [], count: 0, totalBalance: 0 },
      revolvingDebts:   { items: [], count: 0, totalBalance: 0 },
      installmentDebts: { items: [], count: 0, totalBalance: 0 },
      highestApr: null,
      smallestBalance: null,
    };
  }

  const total = debts.reduce((s, d) => s + (d.balance ?? 0), 0);
  
  const totalMonthlyPayment = debts.reduce((s, d) => s + getMonthlyPayment(d), 0);

  const weightedApr =
    total === 0
      ? 0
      : debts.reduce((s, d) => s + (d.apr ?? 0) * (d.balance ?? 0), 0) / total;


  const bankLoanItems    = debts.filter(d => d.type === "bank_loan");
  const revolvingItems   = debts.filter(d => d.type === "revolving");
  const installmentItems = debts.filter(d => d.type === "installment");
  
  // Safely find the highest APR and smallest balance debts
  const highestApr = debts.reduce((a, b) => ((a.apr ?? 0) > (b.apr ?? 0) ? a : b));
  const smallestBalance = debts.reduce((a, b) => ((a.balance ?? 0) < (b.balance ?? 0) ? a : b));

  return {
    total,
    totalMonthlyPayment,
    avgApr: weightedApr,
    // FIX: Return an object for each group containing items, count, and total balance
    bankLoanDebts: {
      items: bankLoanItems,
      count: bankLoanItems.length,
      totalBalance: bankLoanItems.reduce((sum, d) => sum + (d.balance ?? 0), 0),
    },
    revolvingDebts: {
      items: revolvingItems,
      count: revolvingItems.length,
      totalBalance: revolvingItems.reduce((sum, d) => sum + (d.balance ?? 0), 0),
    },
    installmentDebts: {
      items: installmentItems,
      count: installmentItems.length,
      totalBalance: installmentItems.reduce((sum, d) => sum + (d.balance ?? 0), 0),
    },
    highestApr,
    smallestBalance,
  };
};