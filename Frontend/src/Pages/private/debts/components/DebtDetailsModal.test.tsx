import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import DebtDetailsModal from "./DebtDetailsModal";
import { emptyPaymentBreakdown } from "../__fixtures__/paymentBreakdown";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const linkedRow = (overrides: Partial<DebtEditorRowDto> = {}): DebtEditorRowDto => ({
  id: "11111111-1111-4111-8111-111111111111",
  sourceDebtId: "22222222-2222-4222-8222-222222222222",
  name: "Privatlån",
  type: "bank_loan",
  balance: 38500,
  sourceBalance: 38500,
  apr: 6.4,
  sourceApr: 6.4,
  monthlyFee: null,
  sourceMonthlyFee: null,
  minPayment: 1100,
  sourceMinPayment: 1100,
  termMonths: 28,
  sourceTermMonths: 28,
  monthlyPayment: 1500,
  sourceMonthlyPayment: 1200,
  sourceLifecycleStatus: "active",
  participationStatus: "included",
  isMonthOnly: false,
  isRemoved: false,
  sortOrder: 1,
  group: "active",
  progress: null,
  paymentBreakdown: emptyPaymentBreakdown,
  actions: {
    canEditPayment: true,
    canEditDetails: true,
    canUpdateBalance: true,
    canSkipThisMonth: true,
    canIncludeThisMonth: false,
    canMarkPaidOff: true,
    canArchive: true,
    canRestore: false,
    canRemove: false,
    canUpdatePlan: true,
  },
  disabledReasons: [],
  ...overrides,
});

describe("DebtDetailsModal", () => {
  it("seeds editable fields from the row's month-side values and shows balance read-only with copy", () => {
    render(
      <DebtDetailsModal
        open
        row={linkedRow()}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Privatlån");
    expect(screen.getByTestId("debt-details-type")).toHaveValue("bank_loan");
    expect(screen.getByLabelText("Annual rate (%)")).toHaveValue("6.4");
    expect(screen.getByLabelText(/Minimum payment/)).toHaveValue("1100");
    expect(screen.getByLabelText("Planned monthly payment")).toHaveValue("1500");

    // Balance appears in the facts strip — not as an editable input. That
    // line keeps the user honest about where balance changes live (PR 3
    // `Uppdatera saldo`, not the details flow).
    expect(screen.getByTestId("debt-details-facts-balance")).toHaveTextContent(
      /38[,\s]?500/,
    );
    expect(screen.queryByLabelText(/balance/i)).not.toBeInTheDocument();
  });

  it("submits with the selected scope and the row id so the parent can wire PATCH .../details", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DebtDetailsModal
        open
        row={linkedRow()}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Privatlån (renamed)" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /budget plan going forward only/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Privatlån (renamed)",
        type: "bank_loan",
        apr: 6.4,
        monthlyFee: null,
        minPayment: 1100,
        termMonths: 28,
        monthlyPayment: 1500,
        scope: "budgetPlanOnly",
      });
    });
  });

  it("disables the plan-writing scope cards for month-only rows and shows the explanatory hint", () => {
    render(
      <DebtDetailsModal
        open
        row={linkedRow({
          sourceDebtId: null,
          isMonthOnly: true,
          sourceBalance: null,
          sourceApr: null,
          sourceMinPayment: null,
          sourceTermMonths: null,
          sourceMonthlyPayment: null,
          actions: {
            ...linkedRow().actions,
            canUpdatePlan: false,
          },
        })}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // EditScopeRadioCards keeps the plan-writing scope cards in the DOM and
    // marks them `disabled` — that lets the user see them and read the
    // explanatory hint instead of silently dropping the option. The wire
    // payload is still safe because the modal's submit narrows to
    // `currentMonthOnly` when the row says plan scopes are disallowed.
    expect(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("radio", { name: /budget plan going forward only/i }),
    ).toBeDisabled();
    expect(
      screen.getByText("This debt only exists in the current month."),
    ).toBeInTheDocument();
  });

  it("never lets a stale plan-scope selection leak through when the row forbids plan writes", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const monthOnlyRow = linkedRow({
      sourceDebtId: null,
      isMonthOnly: true,
      sourceBalance: null,
      sourceApr: null,
      sourceMinPayment: null,
      sourceTermMonths: null,
      sourceMonthlyPayment: null,
      actions: {
        ...linkedRow().actions,
        canUpdatePlan: false,
      },
    });

    render(
      <DebtDetailsModal
        open
        row={monthOnlyRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    // The plan-scope cards are present-but-disabled, so the user can't pick
    // one — but the submit defends in depth: if `actions.canUpdatePlan` is
    // false we always coerce the wire scope to `currentMonthOnly`.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ scope: "currentMonthOnly" }),
      );
    });
  });

  it("rejects revolving submits without a min payment so renaming a card to revolving can't bypass the wizard rule", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DebtDetailsModal
        open
        row={linkedRow({
          minPayment: null,
        })}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByTestId("debt-details-type"), {
      target: { value: "revolving" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByTestId("debt-details-error")).toHaveTextContent(
        /minimum payment is required/i,
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces the backend's error message verbatim when the parent passes one in", () => {
    render(
      <DebtDetailsModal
        open
        row={linkedRow()}
        monthLabel="May 2026"
        submitErrorMessage="Validation failed: name is already taken."
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("debt-details-submit-error")).toHaveTextContent(
      "Validation failed: name is already taken.",
    );
  });

  // ----------------------------------- Debt Polish PR 2: labels + preview

  it("uses the PR 2 labels (Annual rate, Fee per month, Term (months)) so units are explicit", () => {
    render(
      <DebtDetailsModal
        open
        row={linkedRow()}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Annual rate (%)")).toBeInTheDocument();
    expect(screen.getByLabelText(/Fee per month/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Term \(months\)/)).toBeInTheDocument();
  });

  it("recomputes the preview when APR or fee change so the user sees the principal shift before save", () => {
    render(
      <DebtDetailsModal
        open
        row={linkedRow({
          balance: 93000,
          apr: 10.99,
          monthlyFee: 130,
          monthlyPayment: 1550,
        })}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("debt-details-preview-interest")).toHaveTextContent(
      /852/,
    );
    expect(screen.getByTestId("debt-details-preview-principal")).toHaveTextContent(
      /568/,
    );

    fireEvent.change(screen.getByLabelText("Annual rate (%)"), {
      target: { value: "12.99" },
    });
    fireEvent.change(screen.getByLabelText(/Fee per month/), {
      target: { value: "149.99" },
    });

    expect(screen.getByTestId("debt-details-preview-interest")).toHaveTextContent(
      /1[,\s]?007/,
    );
    expect(screen.getByTestId("debt-details-preview-principal")).toHaveTextContent(
      /393/,
    );
  });

  it("shows plan-side math under budgetPlanOnly so the preview matches the values that will actually be saved", () => {
    render(
      <DebtDetailsModal
        open
        row={linkedRow({
          balance: 93000,
          sourceBalance: 93000,
          apr: 10.99,
          monthlyFee: 130,
          monthlyPayment: 1550,
        })}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Annual rate (%)"), {
      target: { value: "20" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /budget plan going forward only/i }),
    );

    // The plan side will receive the edited 20% APR. Against the plan-side
    // balance (93,000 here), monthly interest = 93000 * 20 / 100 / 12 = 1550.
    // The preview must reflect that — the old behavior of showing 10.99%
    // math under a plan-only edit was a lie about what gets saved.
    expect(screen.getByTestId("debt-details-preview-interest")).toHaveTextContent(
      /1[,\s]?550/,
    );
    // Subtitle / projected-after copy swap to plan-aware variants so the
    // preview never implies a current-month effect.
    expect(
      screen.getByText("How a planned month's payment splits"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Projected balance after a planned month/i),
    ).toBeInTheDocument();
    // The scope hint row still tells the user the current month is untouched.
    const hints = screen.getByTestId("debt-details-preview-plan-hints");
    expect(hints).toHaveAttribute("data-current-receives-edit", "false");
    expect(hints).toHaveAttribute("data-plan-receives-edit", "true");
  });

  it("uses sourceBalance under budgetPlanOnly when it diverges from the current-month balance", () => {
    // The plan-side balance may legitimately differ from the current month's
    // balance (e.g. after an audited balance correction on one side). Under
    // `budgetPlanOnly` the preview must compute interest against the
    // plan-side balance, not the visible row balance.
    render(
      <DebtDetailsModal
        open
        row={linkedRow({
          balance: 50000,
          sourceBalance: 120000,
          apr: 12,
          monthlyFee: 0,
          monthlyPayment: 2000,
        })}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", { name: /budget plan going forward only/i }),
    );

    // 120000 * 12 / 100 / 12 = 1200 (plan-side interest), not 500 (would be
    // current-month interest at 50000 balance).
    expect(screen.getByTestId("debt-details-preview-interest")).toHaveTextContent(
      /1[,\s]?200/,
    );
  });

  it("shows the amber shortfall advisory when the edited payment cannot cover interest + fee", () => {
    render(
      <DebtDetailsModal
        open
        row={linkedRow({
          balance: 50000,
          apr: 24,
          monthlyFee: 50,
          monthlyPayment: 1500,
        })}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Planned monthly payment"), {
      target: { value: "800" },
    });

    const shortfall = screen.getByTestId("debt-details-preview-shortfall");
    expect(shortfall).toHaveTextContent(/does not cover interest and fee/i);
    expect(shortfall).toHaveTextContent(/250/);
  });

  it("never mutates the row's balance facts when APR, fee, or payment change in the preview", () => {
    render(
      <DebtDetailsModal
        open
        row={linkedRow({
          balance: 38500,
          apr: 6.4,
          monthlyFee: null,
          monthlyPayment: 1500,
        })}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Annual rate (%)"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText(/Fee per month/), {
      target: { value: "200" },
    });
    fireEvent.change(screen.getByLabelText("Planned monthly payment"), {
      target: { value: "3000" },
    });

    // The "Owed balance" facts strip always reflects the row's stored value
    // regardless of how the preview math shifts — balance never changes here.
    expect(screen.getByTestId("debt-details-facts-balance")).toHaveTextContent(
      /38[,\s]?500/,
    );
  });
});
