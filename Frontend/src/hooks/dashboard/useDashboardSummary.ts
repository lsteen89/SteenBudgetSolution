import { useEffect, useMemo } from "react";
import { useBudgetDashboardStore } from "@/stores/Budget/budgetDashboardStore";
import { buildDashboardSummaryAggregate } from "./buildDashboardSummaryAggregate";
import type { DashboardSummaryAggregate } from "./dashboardSummary.types";

export const useDashboardSummary = () => {
    const { dashboard, status, error, loadDashboard } = useBudgetDashboardStore();

    const dev = import.meta.env.MODE === "development";
    const mock = dev ? new URLSearchParams(window.location.search).get("mockDashboard") : null;

    useEffect(() => {
        if (status === "idle") void loadDashboard();
    }, [status, loadDashboard]);

    const data = useMemo<DashboardSummaryAggregate | null>(
        () => (dashboard ? buildDashboardSummaryAggregate(dashboard) : null),
        [dashboard]
    );

    const refetch = () => loadDashboard({ force: true });

    if (mock === "loading") return { data: null, status: "loading" as const, error: null, refetch };
    if (mock === "notfound") return { data: null, status: "notfound" as const, error: null, refetch };
    if (mock === "error")
        return {
            data: null,
            status: "error" as const,
            error: { message: "Simulated error", code: "SIMULATED", status: 500 },
            refetch,
        };
    if (mock === "ready" && data) return { data, status: "ready" as const, error: null, refetch };

    // If store status says ready but dashboard is null, treat as notfound to keep UI sane.
    if (status === "ready" && !data) return { data: null, status: "notfound" as const, error: null, refetch };

    return { data, status, error, refetch };
};
