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
    fireEvent.change(screen.getByLabelText("Rate"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/^Term/), {
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
    fireEvent.change(screen.getByLabelText("Rate"), {
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
});
