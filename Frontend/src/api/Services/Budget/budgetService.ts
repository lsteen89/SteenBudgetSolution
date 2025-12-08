import { api } from '@/api/axios';
import { isAxiosError } from 'axios';
import type { ApiEnvelope } from '@/api/api.types';
import type { BudgetDashboardDto } from '@myTypes/budget/BudgetDashboardDto';

export async function fetchBudgetDashboard(): Promise<BudgetDashboardDto | null> {
    try {
        const res = await api.get<ApiEnvelope<BudgetDashboardDto>>('/api/budgets/dashboard');
        const env = res.data;

        if (!env.isSuccess) {
            throw new Error(env.error?.message ?? 'Failed to load budget dashboard.');
        }

        // BE returns null (via 404 mapped) or concrete data; here we only handle 200
        return env.data;
    } catch (err) {
        if (isAxiosError<ApiEnvelope<BudgetDashboardDto>>(err) && err.response) {
            if (err.response.status === 404) {
                // No budget yet -> just treat as "no dashboard data"
                return null;
            }

            const env = err.response.data;
            const msg = env?.error?.message ?? 'Failed to load budget dashboard.';
            throw new Error(msg);
        }

        throw new Error('Failed to load budget dashboard.');
    }
}
