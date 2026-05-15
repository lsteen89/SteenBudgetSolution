import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DebtLedgerSection from "./DebtLedgerSection";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "USD",
}));

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  sourceDebtId: "22222222-2222-4222-8222-222222222222",
  name: "Credit Card",
  type: "revolving",
  balance: 10000,
  apr: 18,
  monthlyFee: 20,
  minPayment: 300,
  termMonths: null,
  monthlyPayment: 700,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

describe("DebtLedgerSection", () => {
  it("renders debt name and uses the shared action menu", () => {
    render(
      <DebtLedgerSection
        rows={[row]}
        total={700}
        readOnly={false}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Credit Card").length).toBeGreaterThan(0);
    const actionButtons = screen.getAllByRole("button", {
      name: "Open row actions",
    });
    expect(actionButtons.length).toBeGreaterThan(0);
  });

  it("hides edit affordances for read-only month state", () => {
    render(
      <DebtLedgerSection
        rows={[row]}
        total={700}
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
      <DebtLedgerSection
        rows={[
          {
            ...row,
            sourceDebtId: null,
            isMonthOnly: true,
            canUpdateDefault: false,
          },
        ]}
        total={700}
        readOnly={false}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getAllByText("This month only").length).toBeGreaterThan(0);
  });
});
