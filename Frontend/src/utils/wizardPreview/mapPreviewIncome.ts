import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";

const num = (v: number | null | undefined) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

export type PreviewIncomeVm = {
    incomeTotal: number;
    netSalaryMonthly: number;
    sideHustleMonthly: number;
    householdMembersMonthly: number;
};

export function mapPreviewIncome(preview: BudgetDashboardDto): PreviewIncomeVm {
    const i = preview.income;
    return {
        incomeTotal: num(i?.totalIncomeMonthly),
        netSalaryMonthly: num(i?.netSalaryMonthly),
        sideHustleMonthly: num(i?.sideHustleMonthly),
        householdMembersMonthly: num(i?.householdMembersMonthly),
    };
}
