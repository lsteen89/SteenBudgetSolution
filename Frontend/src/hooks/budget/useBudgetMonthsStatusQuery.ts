import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { fetchBudgetMonthsStatus } from "@/api/Services/Budget/budgetService";

type Options = {
    enabled?: boolean;
};

export function useBudgetMonthsStatusQuery(opts?: Options) {
    return useQuery({
        queryKey: ["budgetMonthsStatus"],
        queryFn: fetchBudgetMonthsStatus,
        enabled: opts?.enabled ?? true,
        staleTime: 30_000,
        retry: (count, err) => {
            const status = (err as AxiosError)?.response?.status;
            if (status && status >= 400 && status < 500) return false;
            return count < 2;
        },
    });
}
