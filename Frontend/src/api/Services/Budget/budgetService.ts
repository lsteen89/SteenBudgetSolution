import { api } from '@/api/axios';
import { isAxiosError } from 'axios';
import type { ApiEnvelope } from '@/api/api.types';
import type { BudgetDashboardDto } from '@myTypes/budget/BudgetDashboardDto';
import { unwrapEnvelope } from '@/utils/api/apiHelpers';

export async function fetchBudgetDashboard(): Promise<BudgetDashboardDto> {
    const res = await api.get<ApiEnvelope<BudgetDashboardDto>>('/api/budgets/dashboard');
    const env = res.data;
    return unwrapEnvelope(res.data);
}
