import { useMemo } from "react";
import type { CurrencyCode } from "@/utils/money/currency";
import { useWizardSessionStore } from "@/stores/Wizard/wizardSessionStore";
import { useWizardFinalizationPreviewQuery } from "@/hooks/wizard/useWizardFinalizationPreviewQuery";
import { labelCategory } from "@/utils/i18n/categories";
import { useResolvedCurrency } from "@/hooks/useResolvedCurrency";

type SummaryRow = { id: string; label: string; value: number };

type UiModel = {
    categoryRows: SummaryRow[];
    breakdownRows: SummaryRow[];
    finalBalance: number;
    totalIncome: number;
    totalExpenditure: number;
    totalSavings: number;
    totalDebtPayments: number;
    pillarDescriptions: {
        income: string;
        expenditure: string;
        savings: string;
        debts: string;
    };
};


// Keep rounding consistent in FE (optional if you trust BE rounding fully)
const kr = (n: number) => Math.round(n * 100) / 100;

export function useWizardFinalPreviewUi(currency?: CurrencyCode) {
    const resolvedCurrency = useResolvedCurrency();
    const effectiveCurrency = currency ?? resolvedCurrency;
    const sessionId = useWizardSessionStore((s) => s.wizardSessionId);
    const query = useWizardFinalizationPreviewQuery(sessionId);

    const ui = useMemo<UiModel | null>(() => {
        const dto: any = query.data;
        if (!dto) return null;

        const income = dto.income?.totalIncomeMonthly ?? 0;
        const expenses = dto.expenditure?.totalExpensesMonthly ?? 0;

        const habitSavings = dto.savings?.monthlySavings ?? 0;
        const goalSavings = (dto.savings?.goals ?? []).reduce(
            (acc: number, g: any) => acc + (g.monthlyContribution ?? 0),
            0
        );

        const totalSavings = kr(habitSavings + goalSavings);

        const debtPayments = dto.debt?.totalMonthlyPayments ?? 0;

        // The BE already computes this; prefer it.
        const finalBalance = dto.finalBalanceWithCarryMonthly ?? kr(income - expenses - totalSavings - debtPayments);

        // Categories: expenses are rendered as negative in your SummaryGrid
        const categoryRows: SummaryRow[] = (dto.expenditure?.byCategory ?? []).map((c: any) => {
            const raw = c.categoryName ?? "";
            return {
                id: raw || crypto.randomUUID(), // stable key: raw category name
                label: labelCategory(raw, "sv-SE"),
                value: -(c.totalMonthlyAmount ?? 0),
            };
        });

        const breakdownRows: SummaryRow[] = [
            { id: "income", label: "Inkomster", value: income },
            { id: "expenses", label: "Utgifter", value: -expenses },
            { id: "savings", label: "Sparande", value: -totalSavings },
            { id: "debts", label: "Skuldbetalningar", value: -debtPayments },
        ].filter((r) => r.value !== 0);

        return {
            categoryRows,
            breakdownRows,
            finalBalance,
            totalIncome: income,
            totalExpenditure: expenses,
            totalSavings,
            totalDebtPayments: debtPayments,
            pillarDescriptions: {
                income: "Från lön, sidoinkomster och andra källor i hushållet.",
                expenditure: "Dina största utgifter syns i sammanställningen ovan.",
                savings: dto.savings?.goals?.length
                    ? `Du sparar mot ${dto.savings.goals.length} mål.`
                    : "Du har inga sparmål registrerade.",
                debts: "Skuldbetalningar baseras på dina angivna lån och villkor.",
            },
        };
    }, [query.data, currency]);

    return { query, ui };
}
