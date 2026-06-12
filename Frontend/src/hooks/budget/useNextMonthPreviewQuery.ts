import { fetchNextMonthPreview } from "@/api/Services/Budget/budgetService";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";

type Options = {
  enabled?: boolean;
};

export function nextMonthPreviewQueryKey(fromYearMonth: string | null) {
  return ["nextMonthPreview", fromYearMonth ?? null] as const;
}

/**
 * Read-only next-month preview for the given from-month (the active open
 * month). Pass `null` with `enabled: false` while the open month is still
 * resolving so the query stays idle rather than firing against an empty key.
 */
export function useNextMonthPreviewQuery(
  fromYearMonth: string | null,
  opts?: Options,
) {
  return useQuery({
    queryKey: nextMonthPreviewQueryKey(fromYearMonth),
    queryFn: () => fetchNextMonthPreview(fromYearMonth as string),
    enabled: (opts?.enabled ?? true) && !!fromYearMonth,
    staleTime: 10_000,
    retry: (count, err) => {
      const status = (err as AxiosError)?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });
}
