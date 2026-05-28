import { fetchSavingsGoalCompletionCandidates } from "@/api/Services/Budget/budgetService";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";

type Options = {
  enabled?: boolean;
};

export function savingsGoalCompletionCandidatesQueryKey(
  yearMonth?: string | null,
) {
  return ["savingsGoalCompletionCandidates", yearMonth ?? null] as const;
}

export function useSavingsGoalCompletionCandidatesQuery(
  yearMonth: string | null | undefined,
  opts?: Options,
) {
  return useQuery({
    queryKey: savingsGoalCompletionCandidatesQueryKey(yearMonth),
    queryFn: () => {
      if (!yearMonth) {
        throw new Error("Missing yearMonth.");
      }

      return fetchSavingsGoalCompletionCandidates(yearMonth);
    },
    enabled: (opts?.enabled ?? true) && !!yearMonth,
    staleTime: 15_000,
    retry: (count, err) => {
      const status = (err as AxiosError)?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}
