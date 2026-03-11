import { toApiProblem } from "@/api/toApiProblem";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import type { CurrencyCode } from "@/utils/money/currency";
import { useCallback, useEffect, useMemo } from "react";
import { buildDashboardSummaryAggregate } from "./buildDashboardSummaryAggregate";

type UseDashboardSummaryOptions = { enabled?: boolean };

export const useDashboardSummary = (opts?: UseDashboardSummaryOptions) => {
  const enabled = opts?.enabled ?? true;
  const locale = useAppLocale();

  const selectedYm = useBudgetMonthStore((s) => s.selectedYearMonth);
  const setSelectedYm = useBudgetMonthStore((s) => s.setSelectedYearMonth);

  const monthsQ = useBudgetMonthsStatusQuery({ enabled });
  const dashQ = useBudgetDashboardMonthQuery(selectedYm, { enabled });

  // currency from BE (hardcoded there for now)
  const currency: CurrencyCode = dashQ.data?.currencyCode ?? "SEK";

  const monthsPending = (monthsQ as any).isPending ?? monthsQ.isLoading;
  const dashPending = (dashQ as any).isPending ?? dashQ.isLoading;

  const isPending = monthsPending || dashPending;
  const isError = monthsQ.isError || dashQ.isError;
  const isSuccess = monthsQ.isSuccess && dashQ.isSuccess;

  const error = monthsQ.isError
    ? toApiProblem(monthsQ.error)
    : dashQ.isError
      ? toApiProblem(dashQ.error)
      : null;

  useEffect(() => {
    if (!enabled) return; // <— important
    const ym = dashQ.data?.month?.yearMonth;
    if (ym && selectedYm == null) setSelectedYm(ym);
  }, [enabled, dashQ.data?.month?.yearMonth, selectedYm, setSelectedYm]);

  const data = useMemo(
    () =>
      dashQ.data
        ? buildDashboardSummaryAggregate(dashQ.data, currency, locale)
        : null,
    [dashQ.data, currency, locale],
  );

  const refetchAll = useCallback(() => {
    if (!enabled) return;
    void monthsQ.refetch();
    void dashQ.refetch();
  }, [enabled, monthsQ, dashQ]);

  return {
    data,
    currency,
    monthsStatus: monthsQ.data,
    dashboardMonth: dashQ.data,

    isPending,
    isError,
    isSuccess,
    isFetching: monthsQ.isFetching || dashQ.isFetching,

    error,
    refetch: refetchAll,
  };
};
