import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardContent from "../DashboardContent";

vi.mock("@hooks/dashboard/useDashboardSummary", () => ({
    useDashboardSummary: vi.fn(),
}));

import { useDashboardSummary } from "@hooks/dashboard/useDashboardSummary";

describe("DashboardContent", () => {
    it("renders skeleton when status is loading", () => {
        (useDashboardSummary as any).mockReturnValue({
            data: null,
            status: "loading",
            error: null,
            refetch: vi.fn(),
        });

        render(
            <MemoryRouter>
                <DashboardContent
                    navigate={vi.fn() as any}
                    isFirstTimeLogin={false}
                    isWizardOpen={false}
                    setIsWizardOpen={vi.fn()}
                />
            </MemoryRouter>
        );

        expect(screen.getByTestId("dashboard-home-skeleton")).toBeInTheDocument();
    });

    it("renders first-time dashboard when status=notfound", () => {
        (useDashboardSummary as any).mockReturnValue({
            data: null,
            status: "notfound",
            error: null,
            refetch: vi.fn(),
        });

        render(
            <MemoryRouter>
                <DashboardContent
                    navigate={vi.fn() as any}
                    isFirstTimeLogin={false}
                    isWizardOpen={false}
                    setIsWizardOpen={vi.fn()}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/Välkommen till eBudget/i)).toBeInTheDocument();
    });

    it("renders error state and calls refetch on retry", () => {
        const refetch = vi.fn();

        (useDashboardSummary as any).mockReturnValue({
            data: null,
            status: "error",
            error: { message: "Boom" },
            refetch,
        });

        render(
            <MemoryRouter>
                <DashboardContent
                    navigate={vi.fn() as any}
                    isFirstTimeLogin={false}
                    isWizardOpen={false}
                    setIsWizardOpen={vi.fn()}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/Kunde inte ladda din dashboard/i)).toBeInTheDocument();
        expect(screen.getByText("Boom")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Retry" }));
        expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("renders returning dashboard when ready", () => {
        (useDashboardSummary as any).mockReturnValue({
            data: {
                monthLabel: "december 2025",
                remainingToSpend: 1000,
                remainingCurrency: "kr",
                emergencyFundAmount: 0,
                emergencyFundMonths: 0,
                goalsProgressPercent: 0,
                totalIncome: 0,
                totalExpenditure: 0,
                habitSavings: 0,
                goalSavings: 0,
                totalSavings: 0,
                totalDebtPayments: 0,
                finalBalance: 1000,
                subscriptionsTotal: 0,
                subscriptionsCount: 0,
                subscriptions: [],
                pillarDescriptions: { income: "", expenditure: "", savings: "", debts: "" },
                recurringExpenses: [],
            },
            status: "ready",
            error: null,
            refetch: vi.fn(),
        });

        render(
            <MemoryRouter>
                <DashboardContent
                    navigate={vi.fn() as any}
                    isFirstTimeLogin={false}
                    isWizardOpen={false}
                    setIsWizardOpen={vi.fn()}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/Välkommen tillbaka/i)).toBeInTheDocument();
    });
});
