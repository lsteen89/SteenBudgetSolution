import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SavingsGoalLedgerSection from "./SavingsGoalLedgerSection";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "USD",
}));

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  sourceSavingsGoalId: "22222222-2222-4222-8222-222222222222",
  name: "Emergency fund",
  targetAmount: 50000,
  targetDate: "2026-12-31",
  amountSaved: 10000,
  monthlyContribution: 1500,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

describe("SavingsGoalLedgerSection", () => {
  it("renders goal name and uses the shared action menu", () => {
    render(
      <SavingsGoalLedgerSection
        rows={[row]}
        total={1500}
        readOnly={false}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Emergency fund").length).toBeGreaterThan(0);
    const actionButtons = screen.getAllByRole("button", {
      name: "Open row actions",
    });
    expect(actionButtons.length).toBeGreaterThan(0);
  });

  it("hides edit affordances for read-only month state", () => {
    render(
      <SavingsGoalLedgerSection
        rows={[row]}
        total={1500}
        readOnly
        onEdit={vi.fn()}
      />,
    );

    expect(
      screen.getAllByRole("button", { name: "Actions unavailable" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: "Open row actions" }),
    ).toBeNull();
  });

  it("shows the month-only badge for rows without a plan link", () => {
    render(
      <SavingsGoalLedgerSection
        rows={[
          {
            ...row,
            sourceSavingsGoalId: null,
            isMonthOnly: true,
            canUpdateDefault: false,
          },
        ]}
        total={1500}
        readOnly={false}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getAllByText("This month only").length).toBeGreaterThan(0);
  });
});
