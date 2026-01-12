import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startBudgetMonth } from "@/api/Services/Budget/budgetService";

export function useStartBudgetMonthMutation() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: startBudgetMonth,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["budgetMonthsStatus"] });
            await qc.invalidateQueries({ queryKey: ["budgetDashboardMonth"] });
        },
    });
}
