import { fetchBudgetDashboardMonth } from "@/api/Services/Budget/budgetService";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";

type Options = {
  enabled?: boolean;
};

export function budgetDashboardMonthQueryKey(yearMonth?: string | null) {
  if (yearMonth === undefined) {
    return ["budgetDashboardMonth"] as const;
  }

  return ["budgetDashboardMonth", yearMonth ?? null] as const;
}

export function useBudgetDashboardMonthQuery(
  yearMonth: string | null,
  opts?: Options,
) {
  return useQuery({
    queryKey: budgetDashboardMonthQueryKey(yearMonth),
    queryFn: () => fetchBudgetDashboardMonth(yearMonth ?? undefined),
    enabled: opts?.enabled ?? true,
    staleTime: 10_000,
    placeholderData: (previousData) => previousData,
    retry: (count, err) => {
      const status = (err as AxiosError)?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}
