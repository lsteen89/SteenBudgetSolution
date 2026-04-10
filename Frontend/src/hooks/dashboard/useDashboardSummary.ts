import { toApiProblem } from "@/api/toApiProblem";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import type { DashboardSummaryAggregate } from "@/hooks/dashboard/dashboardSummary.types";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import { useCallback, useEffect, useMemo } from "react";
import { buildDashboardSummaryAggregate } from "./buildDashboardSummaryAggregate";
import {
  getAdjacentYearMonths,
  getSortedYearMonths,
} from "./dashboardMonthNavigation";

type UseDashboardSummaryOptions = { enabled?: boolean };

function ymLabel(ym: string, locale: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString(locale, { year: "numeric", month: "long" });
}

export const useDashboardSummary = (opts?: UseDashboardSummaryOptions) => {
  const enabled = opts?.enabled ?? true;
  const locale = useAppLocale();

  const selectedYm = useBudgetMonthStore((s) => s.selectedYearMonth);
  const setSelectedYm = useBudgetMonthStore((s) => s.setSelectedYearMonth);

  const monthsQ = useBudgetMonthsStatusQuery({ enabled });
  const dashQ = useBudgetDashboardMonthQuery(selectedYm, { enabled });

  const monthsPending = (monthsQ as any).isPending ?? monthsQ.isLoading;
  const dashPending = (dashQ as any).isPending ?? dashQ.isLoading;

  const isPending = !enabled ? false : monthsPending || dashPending;
  const isError = !enabled ? false : monthsQ.isError || dashQ.isError;
  const isSuccess = !enabled ? false : monthsQ.isSuccess && dashQ.isSuccess;

  const error = !enabled
    ? null
    : monthsQ.isError
      ? toApiProblem(monthsQ.error)
      : dashQ.isError
        ? toApiProblem(dashQ.error)
        : null;

  useEffect(() => {
    if (!enabled) return;

    const ym = dashQ.data?.month?.yearMonth;
    if (ym && selectedYm == null) {
      setSelectedYm(ym);
    }
  }, [enabled, dashQ.data?.month?.yearMonth, selectedYm, setSelectedYm]);
  const data = useMemo<DashboardSummaryAggregate | null>(() => {
    if (!enabled || !dashQ.data) return null;

    const aggregate = buildDashboardSummaryAggregate(dashQ.data, locale);

    const currentYm = dashQ.data.month.yearMonth;
    const monthRows = monthsQ.data?.months ?? [];
    const yearMonths = getSortedYearMonths(monthRows);

    const nav = getAdjacentYearMonths(yearMonths, currentYm);

    return {
      ...aggregate,
      summary: {
        ...aggregate.summary,
        header: {
          ...aggregate.summary.header,
          previousPeriodLabel: nav.previousYearMonth
            ? ymLabel(nav.previousYearMonth, locale)
            : null,
          nextPeriodLabel: nav.nextYearMonth
            ? ymLabel(nav.nextYearMonth, locale)
            : null,
          canGoPrevious: nav.canGoPrevious,
          canGoNext: nav.canGoNext,
        },
      },
    };
  }, [enabled, dashQ.data, monthsQ.data, locale]);

  const goToPreviousMonth = useCallback(() => {
    const currentYm = dashQ.data?.month.yearMonth;
    const monthRows = monthsQ.data?.months ?? [];
    if (!currentYm || monthRows.length === 0) return;

    const yearMonths = getSortedYearMonths(monthRows);
    const nav = getAdjacentYearMonths(yearMonths, currentYm);

    if (nav.previousYearMonth) {
      setSelectedYm(nav.previousYearMonth);
    }
  }, [dashQ.data?.month.yearMonth, monthsQ.data, setSelectedYm]);

  const goToNextMonth = useCallback(() => {
    const currentYm = dashQ.data?.month.yearMonth;
    const monthRows = monthsQ.data?.months ?? [];
    if (!currentYm || monthRows.length === 0) return;

    const yearMonths = getSortedYearMonths(monthRows);
    const nav = getAdjacentYearMonths(yearMonths, currentYm);

    if (nav.nextYearMonth) {
      setSelectedYm(nav.nextYearMonth);
    }
  }, [dashQ.data?.month.yearMonth, monthsQ.data, setSelectedYm]);

  const refetchAll = useCallback(() => {
    if (!enabled) return;
    void monthsQ.refetch();
    void dashQ.refetch();
  }, [enabled, monthsQ, dashQ]);

  return {
    data,
    currency: dashQ.data?.currencyCode ?? null,
    monthsStatus: monthsQ.data,
    dashboardMonth: dashQ.data,

    selectedYearMonth: selectedYm,
    setSelectedYearMonth: setSelectedYm,
    goToPreviousMonth,
    goToNextMonth,

    isPending,
    isError,
    isSuccess,
    isFetching: monthsQ.isFetching || dashQ.isFetching,

    error,
    refetch: refetchAll,
  };
};
