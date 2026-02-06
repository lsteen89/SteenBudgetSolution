import type { BudgetDashboardDto, DashboardDebtItemDto } from "@/types/budget/BudgetDashboardDto";
import type { RepaymentStrategy } from "@/types/Wizard/Step4_Debt/DebtFormValues";

function n(v: unknown): number {
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
const clamp0 = (x: number) => (Number.isFinite(x) ? Math.max(0, x) : 0);

function monthlyInterest(balance: number, apr: number) {
    // rough: interest-only, no compounding detail
    return clamp0(balance) * (clamp0(apr) / 100) / 12;
}

function approxPayoffMonths(balance: number, monthlyPayment: number) {
    const P = clamp0(balance);
    const m = clamp0(monthlyPayment);
    if (P <= 0 || m <= 0) return null;
    return Math.ceil(P / m);
}

export type DebtsConfirmVm = {
    totalDebtBalance: number;
    totalMonthlyPayments: number;
    avgApr: number;
    repaymentStrategy: RepaymentStrategy;
    avalanche: {
        targetLabel: string;     // "Kreditkort (19.9%)"
        microCta: string;        // "Ger lägst totalkostnad (ränta)"
        estimateLine?: string;   // "Ca 330 kr/mån i ränta idag"
    };

    snowball: {
        targetLabel: string;     // "Kreditkort (15 000 kr)"
        microCta: string;        // "Ger snabbast första ‘seger’"
        estimateLine?: string;   // "Första skuld borta om ca 8 mån*"
        footnote?: string;       // "* Grovt estimat..."
    };
};

export function mapFinalizationPreviewToDebtsConfirm(preview: BudgetDashboardDto): DebtsConfirmVm {
    const debt = preview.debt;
    const items = (debt.debts ?? []) as DashboardDebtItemDto[];

    const repaymentStrategy = (debt as any).repaymentStrategy ?? null;

    const totalDebtBalance = n(debt.totalDebtBalance);
    const totalMonthlyPayments = n(debt.totalMonthlyPayments);

    const totalBalanceForWeight = items.reduce((s, d) => s + clamp0(n(d.balance)), 0);
    const weightedAprSum = items.reduce((s, d) => s + clamp0(n(d.balance)) * clamp0(n(d.apr)), 0);
    const avgApr = totalBalanceForWeight > 0 ? weightedAprSum / totalBalanceForWeight : 0;

    const highestAprDebt = items
        .filter((d) => n(d.balance) > 0)
        .slice()
        .sort((a, b) => n(b.apr) - n(a.apr))[0];

    const smallestBalanceDebt = items
        .filter((d) => n(d.balance) > 0)
        .slice()
        .sort((a, b) => n(a.balance) - n(b.balance))[0];

    // Labels for chips (no money formatting here; do it in UI)
    const avalancheTargetLabel = highestAprDebt
        ? `${highestAprDebt.name} (${clamp0(n(highestAprDebt.apr)).toFixed(1)}%)`
        : "—";

    const snowballTargetLabel = smallestBalanceDebt
        ? `${smallestBalanceDebt.name} (${clamp0(n(smallestBalanceDebt.balance))} kr)`
        : "—";

    // Estimates (rough)
    const avalancheInterest = highestAprDebt
        ? monthlyInterest(n(highestAprDebt.balance), n(highestAprDebt.apr))
        : 0;

    const snowballMonths = smallestBalanceDebt
        ? approxPayoffMonths(n(smallestBalanceDebt.balance), n(smallestBalanceDebt.monthlyPayment))
        : null;

    return {
        totalDebtBalance,
        totalMonthlyPayments,
        avgApr,
        repaymentStrategy: repaymentStrategy as RepaymentStrategy,
        avalanche: {
            targetLabel: avalancheTargetLabel,
            microCta: "Ger lägst totalkostnad (ränta).",
            estimateLine: highestAprDebt
                ? `Ca ${Math.round(avalancheInterest)} kr/mån i ränta idag*`
                : undefined,
        },

        snowball: {
            targetLabel: snowballTargetLabel,
            microCta: "Ger snabbast första ‘seger’.",
            estimateLine: snowballMonths ? `Första skuld borta om ca ${snowballMonths} mån*` : undefined,
            footnote: "* Grova estimat baserat på dagens saldo/betalning. Resultat kan skilja sig.",
        },
    };
}
