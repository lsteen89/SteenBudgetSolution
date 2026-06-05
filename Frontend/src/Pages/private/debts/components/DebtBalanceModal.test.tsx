import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import DebtBalanceModal from "./DebtBalanceModal";
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

describe("DebtBalanceModal", () => {
  it("seeds the new-balance input from the row and shows the planned payment as read-only context", () => {
    render(
      <DebtBalanceModal
        open
        row={linkedRow()}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/New balance/)).toHaveValue("38500");
    // Planned payment is context only — never an editable field here.
    expect(screen.getByTestId("debt-balance-context-payment")).toHaveTextContent(
      /1[,\s]?500/,
    );
    // The callout promises the planned payment is not affected (inverse of the
    // planned-payment drawer's "saldo påverkas inte").
    expect(screen.getByTestId("debt-balance-callout")).toHaveTextContent(
      /Planned payment is not affected/i,
    );
  });

  it("submits new balance, scope, and note with the row id so the parent can wire the PR 3 endpoint", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DebtBalanceModal
        open
        row={linkedRow()}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/New balance/), {
      target: { value: "30000" },
    });
    fireEvent.change(screen.getByTestId("debt-balance-note"), {
      target: { value: "New statement" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /update the budget plan going forward/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        newBalance: 30000,
        scope: "currentMonthAndBudgetPlan",
        note: "New statement",
      });
    });
  });

  it("sends a null note when the field is left blank", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DebtBalanceModal
        open
        row={linkedRow()}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/New balance/), {
      target: { value: "25000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ newBalance: 25000, note: null }),
      );
    });
  });

  it("rejects a negative balance before calling the parent", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DebtBalanceModal
        open
        row={linkedRow()}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/New balance/), {
      target: { value: "-100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByTestId("debt-balance-error")).toHaveTextContent(
        /valid balance/i,
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("accepts a zero balance (a correction to zero is not paid-off — that stays a lifecycle action)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DebtBalanceModal
        open
        row={linkedRow()}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/New balance/), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ newBalance: 0 }),
      );
    });
  });

  it("disables plan scopes and coerces the wire scope to currentMonthOnly for month-only rows", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <DebtBalanceModal
        open
        row={linkedRow({
          sourceDebtId: null,
          isMonthOnly: true,
          sourceBalance: null,
          actions: { ...linkedRow().actions, canUpdatePlan: false },
        })}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/New balance/), {
      target: { value: "1000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ scope: "currentMonthOnly" }),
      );
    });
  });

  it("re-seeds the input from the source balance when budgetPlanOnly is selected so a month/source divergence is not written into the source", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    // Month row balance (38500) deliberately differs from the source/plan
    // balance (40000). A plan-only correction must operate on the source value,
    // not silently push the month value into the source.
    render(
      <DebtBalanceModal
        open
        row={linkedRow({ balance: 38500, sourceBalance: 40000 })}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    // Default scope shows the month balance.
    expect(screen.getByLabelText(/New balance/)).toHaveValue("38500");

    // Switching to plan-only re-seeds to the source balance.
    fireEvent.click(
      screen.getByRole("radio", { name: /budget plan going forward only/i }),
    );
    expect(screen.getByLabelText(/New balance/)).toHaveValue("40000");

    // Submitting without further edits writes the SOURCE balance, never the
    // month balance.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        newBalance: 40000,
        scope: "budgetPlanOnly",
        note: null,
      });
    });
  });

  it("re-seeds back to the month balance when switching from plan-only to current-month", () => {
    render(
      <DebtBalanceModal
        open
        row={linkedRow({ balance: 38500, sourceBalance: 40000 })}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", { name: /budget plan going forward only/i }),
    );
    expect(screen.getByLabelText(/New balance/)).toHaveValue("40000");

    fireEvent.click(
      screen.getByRole("radio", { name: /only for may 2026/i }),
    );
    expect(screen.getByLabelText(/New balance/)).toHaveValue("38500");
  });

  it("surfaces the backend error message verbatim", () => {
    render(
      <DebtBalanceModal
        open
        row={linkedRow()}
        monthLabel="May 2026"
        submitErrorMessage="Balance must be zero or positive."
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("debt-balance-submit-error")).toHaveTextContent(
      "Balance must be zero or positive.",
    );
  });
});
