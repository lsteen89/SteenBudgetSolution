import type { BreakdownItem } from "@/hooks/dashboard/dashboardSummary.types";
import type { IncomeOverviewDto } from "@myTypes/budget/BudgetDashboardDto";

export function incomeToBreakdownItems(income: IncomeOverviewDto): BreakdownItem[] {
    const items: BreakdownItem[] = [];

    if (income.netSalaryMonthly > 0) {
        items.push({ key: "income:0:salary", label: "Lön (netto)", amount: income.netSalaryMonthly, meta: "Lön" });
    }

    for (const s of income.sideHustles ?? []) {
        if (Math.abs(s.amountMonthly) < 0.005) continue;
        items.push({
            key: `income:1:side:${s.id}`,
            label: s.name,
            amount: s.amountMonthly,
            meta: "Övrig inkomst",
        });
    }

    for (const m of income.householdMembers ?? []) {
        if (Math.abs(m.amountMonthly) < 0.005) continue;
        items.push({
            key: `income:2:member:${m.id}`,
            label: m.name,
            amount: m.amountMonthly,
            meta: "Hushåll",
        });
    }

    // keep statement-like order; optionally sort within each group by amount desc:
    return items.sort((a, b) => b.amount - a.amount); // or remove to keep the prefix order
}

