import { create } from 'zustand';
import { fetchBudgetDashboard } from '@api/Services/Budget/budgetService';
import type { BudgetDashboardDto } from '@myTypes/budget/BudgetDashboardDto';

interface BudgetDashboardState {
    dashboard: BudgetDashboardDto | null;
    isLoading: boolean;
    error: string | null;
    lastLoadedAt: number | null;

    loadDashboard: () => Promise<void>;
    reset: () => void;
}

export const useBudgetDashboardStore = create<BudgetDashboardState>((set, get) => ({
    dashboard: null,
    isLoading: false,
    error: null,
    lastLoadedAt: null,

    async loadDashboard() {
        const { isLoading, lastLoadedAt } = get();

        // Simple throttle: if we loaded very recently, skip
        const now = Date.now();
        if (!isLoading && lastLoadedAt && now - lastLoadedAt < 5_000) {
            return;
        }

        set({ isLoading: true, error: null });

        try {
            const data = await fetchBudgetDashboard();
            set({
                dashboard: data,
                isLoading: false,
                lastLoadedAt: Date.now(),
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unexpected error while loading dashboard.';
            set({ error: msg, isLoading: false });
        }
    },

    reset() {
        set({
            dashboard: null,
            isLoading: false,
            error: null,
            lastLoadedAt: null,
        });
    },
}));
