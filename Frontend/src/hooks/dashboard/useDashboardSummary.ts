import { useEffect, useMemo, useCallback } from "react";
import { toApiProblem } from "@/utils/api/apiHelpers";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { buildDashboardSummaryAggregate } from "./buildDashboardSummaryAggregate";
import type { CurrencyCode } from "@/utils/money/currency";

export const useDashboardSummary = () => {
    const selectedYm = useBudgetMonthStore((s) => s.selectedYearMonth);
    const setSelectedYm = useBudgetMonthStore((s) => s.setSelectedYearMonth);

    const monthsQ = useBudgetMonthsStatusQuery();
    const dashQ = useBudgetDashboardMonthQuery(selectedYm);

    // ✅ currency from BE (hardcoded there for now)
    const currency: CurrencyCode = dashQ.data?.currencyCode ?? "SEK"; // default fallback during loading

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
        const ym = dashQ.data?.month?.yearMonth;
        if (ym && selectedYm == null) setSelectedYm(ym);
    }, [dashQ.data?.month?.yearMonth, selectedYm, setSelectedYm]);

    const data = useMemo(
        () => (dashQ.data ? buildDashboardSummaryAggregate(dashQ.data, currency) : null),
        [dashQ.data, currency]
    );

    const refetchAll = useCallback(() => {
        void monthsQ.refetch();
        void dashQ.refetch();
    }, [monthsQ, dashQ]);
    const refetch = refetchAll;
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
        refetch,
    };
};
