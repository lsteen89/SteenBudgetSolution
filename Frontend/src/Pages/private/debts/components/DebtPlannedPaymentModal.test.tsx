import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DebtPlannedPaymentModal from "./DebtPlannedPaymentModal";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

const linkedRow = {
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

describe("DebtPlannedPaymentModal", () => {
  it("shows scope cards for source-linked rows", () => {
    render(
      <DebtPlannedPaymentModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("radio", { name: /only for may 2026/i }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    ).toBeInTheDocument();
  });

  it("disables budget-plan scopes for month-only rows and surfaces the hint", () => {
    render(
      <DebtPlannedPaymentModal
        open
        row={{
          ...linkedRow,
          sourceDebtId: null,
          isMonthOnly: true,
          canUpdateDefault: false,
        }}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const updatePlanRadio = screen.getByRole("radio", {
      name: /update the budget plan going forward/i,
    });
    const planOnlyRadio = screen.getByRole("radio", {
      name: /budget plan going forward only/i,
    });

    expect(updatePlanRadio).toBeDisabled();
    expect(updatePlanRadio).toHaveAttribute("aria-checked", "false");
    expect(planOnlyRadio).toBeDisabled();
    expect(planOnlyRadio).toHaveAttribute("aria-checked", "false");

    expect(
      screen.getByRole("radio", { name: /only for may 2026/i }),
    ).toHaveAttribute("aria-checked", "true");

    expect(
      screen.getByText("This debt only exists in the current month."),
    ).toBeInTheDocument();
  });

  it("submits the selected budget-plan scope with the new planned payment", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DebtPlannedPaymentModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Planned monthly payment"), {
      target: { value: "850" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        monthlyPayment: 850,
        scope: "budgetPlanOnly",
      });
    });
  });
});
