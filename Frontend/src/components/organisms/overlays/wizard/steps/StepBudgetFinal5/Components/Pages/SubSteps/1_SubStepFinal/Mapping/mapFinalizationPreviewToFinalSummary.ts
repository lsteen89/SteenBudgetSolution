import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { asCategoryKey, labelCategory } from "@/utils/i18n/budget/categories";
import type { AppLocale } from "@/utils/i18n/locale";
import { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

const kr = (n: number) => Math.round(n * 100) / 100;

export type SummaryRow = { id: string; label: string; value: number };

export type VerdictKind = "good" | "tight" | "bad";

export type HealthChip = { label: string; tone: "neutral" | "good" | "warn" };

export type CoachAction =
  | { kind: "none" }
  | { kind: "suggest"; title: string; detail: string }
  | {
      kind: "fix";
      title: string;
      detail: string;
      actionKey: "expenditure" | "savings" | "debts";
    };

export type FinalSummaryVm = {
  incomeRows: SummaryRow[];
  categoryRows: SummaryRow[];
  breakdownRows: SummaryRow[];
  finalBalance: number;

  totalIncome: number;
  totalExpenditure: number;
  totalSavings: number;
  totalDebtPayments: number;
  habitSavingsMonthly: number;
  goalSavingsMonthly: number;

  verdict: { kind: VerdictKind; title: string; detail: string };
  healthChips: HealthChip[];
  coach: CoachAction;

  pillarDescriptions: {
    income: string;
    expenditure: string;
    savings: string;
    debts: string;
  };
};

export function mapFinalizationPreviewToFinalSummary(
  dto: BudgetDashboardDto,
  locale: AppLocale,
  currency: CurrencyCode,
): FinalSummaryVm {
  const money0 = (v: number) =>
    formatMoneyV2(v ?? 0, currency, locale, { fractionDigits: 0 });
  const income = dto.income?.totalIncomeMonthly ?? 0;
  const expenses = dto.expenditure?.totalExpensesMonthly ?? 0;

  const habitSavings = dto.savings?.monthlySavings ?? 0;
  const goalSavings = (dto.savings?.goals ?? []).reduce(
    (acc, g: any) => acc + (g.monthlyContribution ?? 0),
    0,
  );
  const totalSavings = kr(habitSavings + goalSavings);

  const debtPaymentsFromDto = dto.debt?.totalMonthlyPayments ?? 0;

  const debtPaymentsFromItems = kr(
    (dto.debt?.debts ?? []).reduce(
      (sum, d) => sum + (d.monthlyPayment ?? 0),
      0,
    ),
  );

  const debtPayments =
    debtPaymentsFromDto > 0 ? debtPaymentsFromDto : debtPaymentsFromItems;

  const strategy = dto.debt?.repaymentStrategy ?? null;
  // Prefer BE computed.
  const finalBalance =
    dto.finalBalanceWithCarryMonthly ??
    kr(income - expenses - totalSavings - debtPayments);

  const categoryRows: SummaryRow[] = (dto.expenditure?.byCategory ?? []).map(
    (c: any) => {
      const key = asCategoryKey(c.categoryKey ?? c.categoryName);
      return {
        id: key,
        label: labelCategory(key, locale),
        value: -(c.totalMonthlyAmount ?? 0), // negative for your grid
      };
    },
  );

  const incomeRows: SummaryRow[] = [
    {
      id: "salary",
      label: "Lön (netto)",
      value: dto.income?.netSalaryMonthly ?? 0,
    },

    ...(dto.income?.sideHustles ?? []).map((s: any) => ({
      id: `side-${s.id ?? s.name}`,
      label: s.name ?? "Sidoinkomst",
      value: s.amountMonthly ?? 0,
    })),

    ...(dto.income?.householdMembers ?? []).map((m: any) => ({
      id: `member-${m.id ?? m.name}`,
      label: m.name ?? "Hushållsmedlem",
      value: m.amountMonthly ?? 0,
    })),
  ].filter((r) => (r.value ?? 0) !== 0);

  const breakdownRows: SummaryRow[] = [
    { id: "income", label: "Inkomster", value: income },
    { id: "expenses", label: "Utgifter", value: -expenses },
    { id: "savings", label: "Sparande", value: -totalSavings },
    { id: "debts", label: "Skulder (minimi)", value: -debtPayments },
  ].filter((r) => r.value !== 0);

  const habitSavingsMonthly = dto.savings?.monthlySavings ?? 0;
  const goalSavingsMonthly = (dto.savings?.goals ?? []).reduce(
    (a, g: any) => a + (g.monthlyContribution ?? 0),
    0,
  );

  const savingsRate = income > 0 ? totalSavings / income : 0;

  const highestAprDebt = (dto.debt?.debts ?? []).reduce(
    (best: any, d: any) => ((d?.apr ?? 0) > (best?.apr ?? 0) ? d : best),
    null,
  );

  let verdictKind: VerdictKind = "good";
  if (finalBalance < 0) verdictKind = "bad";
  else if (finalBalance < income * 0.05) verdictKind = "tight";

  const verdict: FinalSummaryVm["verdict"] =
    verdictKind === "good"
      ? {
          kind: "good",
          title: "Tryggt",
          detail: `Du har ett överskott på ${money0(finalBalance)} per månad. Skapa budgeten — du kan finjustera efteråt.`,
        }
      : verdictKind === "tight"
        ? {
            kind: "tight",
            title: "Tight",
            detail: `Det går ihop, men marginalen är liten. Skapa budgeten och justera vid behov.`,
          }
        : {
            kind: "bad",
            title: "Ohållbart",
            detail: `Du går minus varje månad. Skapa budgeten ändå — men vi markerar vad som bör justeras direkt.`,
          };

  const healthChips: HealthChip[] = [
    {
      label: `Spargrad ${(savingsRate * 100).toFixed(0)}%`,
      tone:
        savingsRate >= 0.15 ? "good" : savingsRate >= 0.05 ? "neutral" : "warn",
    },
    highestAprDebt?.apr
      ? {
          label: `Hög ränta: ${highestAprDebt.name} (${Number(highestAprDebt.apr).toFixed(1)}%)`,
          tone: Number(highestAprDebt.apr) >= 18 ? "warn" : "neutral",
        }
      : { label: "Inga räntor hittades", tone: "neutral" },
  ].filter(Boolean as any);

  const coach: CoachAction =
    verdictKind === "bad"
      ? {
          kind: "fix",
          title: "En enkel fix nu",
          detail: "Sänk sparandet eller justera utgifter så att du går plus.",
          actionKey: "savings",
        }
      : verdictKind === "tight"
        ? {
            kind: "suggest",
            title: "Gör planen enklare",
            detail:
              "Välj ett huvudmål och låt resten vänta tills du har mer marginal.",
          }
        : {
            kind: "suggest",
            title: "Bra läge",
            detail:
              "Vill du att överskottet går till buffert eller extra amortering?",
          };

  return {
    categoryRows,
    breakdownRows,
    finalBalance,
    totalIncome: income,
    incomeRows,
    totalExpenditure: expenses,
    totalSavings,
    totalDebtPayments: debtPayments,

    habitSavingsMonthly,
    goalSavingsMonthly,
    verdict,
    healthChips,
    coach,

    pillarDescriptions: {
      income: "Från lön, sidoinkomster och andra källor i hushållet.",
      expenditure: "Dina största utgifter syns i sammanställningen ovan.",
      savings: dto.savings?.goals?.length
        ? `Du sparar mot ${dto.savings.goals.length} mål.`
        : "Du har inga sparmål registrerade.",
      debts: "Skuldbetalningar baseras på dina angivna lån och villkor.",
    },
  };
}
