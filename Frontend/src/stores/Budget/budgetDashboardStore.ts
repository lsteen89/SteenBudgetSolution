import { create } from "zustand";
import type { BudgetDashboardDto } from "@myTypes/budget/BudgetDashboardDto";
import { fetchBudgetDashboard } from "@api/Services/Budget/budgetService";
import { toApiProblem } from "@/utils/api/apiHelpers";
import type { ApiProblem } from "@/api/api.types";

type DashboardStatus = "idle" | "loading" | "ready" | "notfound" | "error";

interface BudgetDashboardState {
    dashboard: BudgetDashboardDto | null;
    status: DashboardStatus;
    error: ApiProblem | null;
    lastLoadedAt: number | null;

    loadDashboard: (opts?: { force?: boolean }) => Promise<void>;
    reset: () => void;
}

const NOTFOUND_CODES = new Set(["BUDGET_NOT_FOUND"]);

export const useBudgetDashboardStore = create<BudgetDashboardState>((set, get) => ({
    dashboard: null,
    status: "idle",
    error: null,
    lastLoadedAt: null,

    async loadDashboard(opts) {
        const { status, lastLoadedAt } = get();
        const now = Date.now();
        const force = opts?.force === true;

        // throttle only when we recently succeeded-ish
        const canThrottle =
            !force &&
            (status === "ready" || status === "notfound") &&
            lastLoadedAt &&
            now - lastLoadedAt < 5_000;

        if (canThrottle) return;

        set({ status: "loading", error: null });

        try {
            const data = await fetchBudgetDashboard();
            set({
                dashboard: data,
                status: "ready",
                error: null,
                lastLoadedAt: Date.now(),
            });
        } catch (err) {
            const problem = toApiProblem(err);

            const isNotFound =
                problem.status === 404 ||
                (problem.code && NOTFOUND_CODES.has(problem.code));

            if (isNotFound) {
                set({
                    dashboard: null,
                    status: "notfound",
                    error: null,
                    lastLoadedAt: Date.now(),
                });
                return;
            }

            set((s) => ({
                dashboard: s.dashboard,
                status: "error",
                error: problem,
                lastLoadedAt: null, // don't throttle retries after error
            }));
        }
    },

    reset() {
        set({
            dashboard: null,
            status: "idle",
            error: null,
            lastLoadedAt: null,
        });
    },
}));
