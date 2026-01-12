import { useQuery } from "@tanstack/react-query";
import { fetchBudgetMonthsStatus } from "@/api/Services/Budget/budgetService";

export function useBudgetMonthsStatusQuery() {
    return useQuery({
        queryKey: ["budgetMonthsStatus"],
        queryFn: fetchBudgetMonthsStatus,
        staleTime: 30_000,
    });
}
