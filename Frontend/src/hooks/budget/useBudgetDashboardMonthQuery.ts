import { useQuery } from "@tanstack/react-query";
import { fetchBudgetDashboardMonth } from "@/api/Services/Budget/budgetService";

export function useBudgetDashboardMonthQuery(yearMonth: string | null) {
    return useQuery({
        queryKey: ["budgetDashboardMonth", yearMonth ?? "default"],
        queryFn: () => fetchBudgetDashboardMonth(yearMonth ?? undefined),
        staleTime: 10_000,
    });
}
