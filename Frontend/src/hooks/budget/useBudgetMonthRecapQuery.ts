import { fetchBudgetMonthRecap } from "@/api/Services/Budget/budgetService";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";

type Options = {
  enabled?: boolean;
};

export function budgetMonthRecapQueryKey(yearMonth?: string | null) {
  return ["budgetMonthRecap", yearMonth ?? null] as const;
}

export function useBudgetMonthRecapQuery(
  yearMonth: string | null,
  opts?: Options,
) {
  return useQuery({
    queryKey: budgetMonthRecapQueryKey(yearMonth),
    queryFn: () => {
      if (!yearMonth) {
        throw new Error("Missing yearMonth.");
      }

      return fetchBudgetMonthRecap(yearMonth);
    },
    enabled: (opts?.enabled ?? true) && !!yearMonth,
    staleTime: 30_000,
    retry: (count, err) => {
      const status = (err as AxiosError)?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}
