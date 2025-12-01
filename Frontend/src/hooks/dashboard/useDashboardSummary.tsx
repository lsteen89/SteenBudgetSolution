import { useMemo } from 'react';

export interface DashboardSummary {
    monthLabel: string;
    remainingToSpend: number;
    remainingCurrency: string;
    emergencyFundAmount: number;
    emergencyFundMonths: number;
    goalsProgressPercent: number;
}

export const useDashboardSummary = () => {
    // TODO: wire this to your backend (React Query, SWR, whatever you use)
    const data: DashboardSummary = useMemo(
        () => ({
            monthLabel: 'November 2025',
            remainingToSpend: 3200,
            remainingCurrency: 'kr',
            emergencyFundAmount: 18000,
            emergencyFundMonths: 3.2,
            goalsProgressPercent: 65,
        }),
        []
    );

    return {
        data,
        isLoading: false,
        isError: false,
    };
};
