import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import DebtDetailsModal from "./DebtDetailsModal";

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
    expect(screen.getByLabelText("Rate")).toHaveValue("6.4");
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
});
