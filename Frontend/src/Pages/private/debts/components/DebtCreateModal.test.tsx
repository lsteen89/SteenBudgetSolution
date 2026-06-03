import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DebtCreateModal from "./DebtCreateModal";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

describe("DebtCreateModal", () => {
  it("defaults to the recurring scope so most adds drop into both this month and the plan", () => {
    render(
      <DebtCreateModal
        open
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("sends the selected scope verbatim to the backend", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DebtCreateModal
        open
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Klarna · Sofa" },
    });
    fireEvent.change(screen.getByTestId("debt-create-type"), {
      target: { value: "installment" },
    });
    fireEvent.change(screen.getByLabelText("Balance · owed"), {
      target: { value: "6400" },
    });
    fireEvent.change(screen.getByLabelText("Annual rate (%)"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/^Term \(months\)/), {
      target: { value: "13" },
    });
    fireEvent.change(screen.getByLabelText("Planned monthly payment"), {
      target: { value: "500" },
    });

    fireEvent.click(
      screen.getByRole("radio", { name: /budget plan going forward only/i }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Add debt" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Klarna · Sofa",
        type: "installment",
        balance: 6400,
        apr: 0,
        monthlyFee: null,
        minPayment: null,
        termMonths: 13,
        monthlyPayment: 500,
        scope: "budgetPlanOnly",
      });
    });
  });

  it("blocks revolving submits without a minimum payment so a credit-card debt can't slip past the wizard's rules", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DebtCreateModal
        open
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "SEB Credit" },
    });
    fireEvent.change(screen.getByTestId("debt-create-type"), {
      target: { value: "revolving" },
    });
    fireEvent.change(screen.getByLabelText("Balance · owed"), {
      target: { value: "10000" },
    });
    fireEvent.change(screen.getByLabelText("Annual rate (%)"), {
      target: { value: "19.9" },
    });
    // intentionally leave Minimum payment blank
    fireEvent.change(screen.getByLabelText("Planned monthly payment"), {
      target: { value: "600" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add debt" }));

    await waitFor(() => {
      expect(screen.getByTestId("debt-create-error")).toHaveTextContent(
        /minimum payment is required/i,
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a month-only callout only when the user picks 'Only this month' so a month-only add is never silent", () => {
    render(
      <DebtCreateModal
        open
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // default scope hides the callout
    expect(
      screen.queryByTestId("debt-create-month-only-callout"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("radio", { name: /only for may 2026/i }),
    );
    expect(
      screen.getByTestId("debt-create-month-only-callout"),
    ).toBeInTheDocument();
  });

  it("surfaces the backend's error message verbatim when the parent passes one in", () => {
    render(
      <DebtCreateModal
        open
        monthLabel="May 2026"
        submitErrorMessage="Name is already taken."
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("debt-create-submit-error")).toHaveTextContent(
      "Name is already taken.",
    );
  });

  // ----------------------------------- Debt Polish PR 2: labels + preview

  it("uses the PR 2 Swedish-grade labels so kr/%/month semantics are explicit", () => {
    render(
      <DebtCreateModal
        open
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // Annual rate (%) replaces the bare "Rate" label so the unit is obvious
    // for a financial product. Same for monthly fee + term.
    expect(screen.getByLabelText("Annual rate (%)")).toBeInTheDocument();
    expect(screen.getByLabelText(/Fee per month/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Term \(months\)/)).toBeInTheDocument();
  });

  it("updates the preview when APR changes so the user sees less principal before saving", () => {
    render(
      <DebtCreateModal
        open
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // PR 1 baseline: 93000 / 10.99 / 130 / 1550 -> interest 851.73,
    // principal 568.27. Whole-krona formatting drops the decimals.
    fireEvent.change(screen.getByLabelText("Balance · owed"), {
      target: { value: "93000" },
    });
    fireEvent.change(screen.getByLabelText("Annual rate (%)"), {
      target: { value: "10.99" },
    });
    fireEvent.change(screen.getByLabelText(/Fee per month/), {
      target: { value: "130" },
    });
    fireEvent.change(screen.getByLabelText("Planned monthly payment"), {
      target: { value: "1550" },
    });

    // 851.73 displayed as whole krona => "852"
    expect(screen.getByTestId("debt-create-preview-interest")).toHaveTextContent(
      /852/,
    );
    expect(screen.getByTestId("debt-create-preview-principal")).toHaveTextContent(
      /568/,
    );

    // Bump APR; principal should shrink visibly. PR 1 "after edit" example
    // uses 12.99 / 149.99 -> interest 1006.73, principal 393.28.
    fireEvent.change(screen.getByLabelText("Annual rate (%)"), {
      target: { value: "12.99" },
    });
    fireEvent.change(screen.getByLabelText(/Fee per month/), {
      target: { value: "149.99" },
    });

    expect(screen.getByTestId("debt-create-preview-interest")).toHaveTextContent(
      /1[,\s]?007/,
    );
    expect(screen.getByTestId("debt-create-preview-principal")).toHaveTextContent(
      /393/,
    );
  });

  it("switches preview copy to plan-aware variants under budgetPlanOnly so the preview never claims a current-month effect that won't happen", () => {
    render(
      <DebtCreateModal
        open
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // Default scope writes to current month: standard subtitle visible.
    expect(
      screen.getByText("How this month's payment splits"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("How a planned month's payment splits"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("radio", { name: /budget plan going forward only/i }),
    );

    expect(
      screen.getByText("How a planned month's payment splits"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("How this month's payment splits"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Projected balance after a planned month/i),
    ).toBeInTheDocument();
  });

  it("surfaces the amber shortfall advisory when the planned payment cannot cover interest + fee", () => {
    render(
      <DebtCreateModal
        open
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // 50000 / 24% APR / 50 fee -> interest 1000 + fee 50 = 1050 requirement;
    // payment 800 falls short by 250.
    fireEvent.change(screen.getByLabelText("Balance · owed"), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText("Annual rate (%)"), {
      target: { value: "24" },
    });
    fireEvent.change(screen.getByLabelText(/Fee per month/), {
      target: { value: "50" },
    });
    fireEvent.change(screen.getByLabelText("Planned monthly payment"), {
      target: { value: "800" },
    });

    const shortfall = screen.getByTestId("debt-create-preview-shortfall");
    expect(shortfall).toHaveTextContent(/does not cover interest and fee/i);
    expect(shortfall).toHaveTextContent(/250/);
    // Projected balance still renders in the shortfall state — the useful
    // truth is "balance stays at 50,000 kr this month", not the absence of
    // a number. The amber advisory above explains the why.
    expect(
      screen.getByTestId("debt-create-preview-projected"),
    ).toHaveTextContent(/50[,\s]?000/);
  });
});
