import { fetchExpenseCategories } from "@/api/Services/Budget/budgetService";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";

type Options = {
  enabled?: boolean;
};

const EXPENSE_CATEGORIES_STALE_TIME_MS = 30 * 60 * 1000;

export function useExpenseCategories(opts?: Options) {
  return useQuery({
    queryKey: ["budgetExpenseCategories"],
    queryFn: fetchExpenseCategories,
    enabled: opts?.enabled ?? true,
    staleTime: EXPENSE_CATEGORIES_STALE_TIME_MS,
    retry: (count, err) => {
      const status = (err as AxiosError)?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}
