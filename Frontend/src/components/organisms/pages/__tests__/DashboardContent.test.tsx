import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import DashboardContent from "../DashboardContent";

vi.mock("@hooks/dashboard/useDashboardSummary", () => ({
    useDashboardSummary: vi.fn(),
}));

import { useDashboardSummary } from "@hooks/dashboard/useDashboardSummary";

const readyMock = {
    data: {
        summary: {
            monthLabel: "december 2025",
            remainingToSpend: 1000,
            remainingCurrency: "SEK",
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
        breakdown: {
            incomeItems: [],
            expenseCategoryItems: [],
            savingsItems: [],
            debtItems: [],
        },
    },
    status: "ready",
    error: null,
    refetch: vi.fn(),
};

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
                <DashboardContent isFirstTimeLogin={false} isWizardOpen={false} setIsWizardOpen={vi.fn()} />
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
                <DashboardContent isFirstTimeLogin={false} isWizardOpen={false} setIsWizardOpen={vi.fn()} />
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
                <DashboardContent isFirstTimeLogin={false} isWizardOpen={false} setIsWizardOpen={vi.fn()} />
            </MemoryRouter>
        );

        expect(screen.getByText(/Kunde inte ladda din dashboard/i)).toBeInTheDocument();
        expect(screen.getByText("Boom")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /retry|försök/i }));
        expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("renders returning dashboard when ready", () => {
        (useDashboardSummary as any).mockReturnValue(readyMock);

        render(
            <MemoryRouter>
                <DashboardContent isFirstTimeLogin={false} isWizardOpen={false} setIsWizardOpen={vi.fn()} />
            </MemoryRouter>
        );

        expect(screen.getByText(/Välkommen tillbaka/i)).toBeInTheDocument();
    });

    it("KPI 'Kvar att spendera' routes to /dashboard/breakdown", () => {
        (useDashboardSummary as any).mockReturnValue(readyMock);

        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <Routes>
                    <Route
                        path="/dashboard"
                        element={<DashboardContent isFirstTimeLogin={false} isWizardOpen={false} setIsWizardOpen={vi.fn()} />}
                    />
                    <Route path="/dashboard/breakdown" element={<div>BREAKDOWN PAGE</div>} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole("link", { name: /Kvar att spendera/i }));
        expect(screen.getByText("BREAKDOWN PAGE")).toBeInTheDocument();
    });
});
