import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import IncomeItemModal from "./IncomeItemModal";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

const linkedRow = {
  id: "11111111-1111-4111-8111-111111111111",
  sourceIncomeItemId: "22222222-2222-4222-8222-222222222222",
  kind: "sideHustle" as const,
  name: "Consulting",
  amountMonthly: 1500,
  isActive: true,
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

describe("IncomeItemModal", () => {
  it("hides scope cards and shows month-only copy when creating", () => {
    render(
      <IncomeItemModal
        open
        mode="create"
        row={null}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Only for May 2026")).toBeInTheDocument();
    expect(
      screen.queryByRole("radiogroup", {
        name: /what should this change apply to/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows scope cards for source-linked income rows", () => {
    render(
      <IncomeItemModal
        open
        mode="edit"
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

  it("hides budget-plan scopes for month-only rows", () => {
    render(
      <IncomeItemModal
        open
        mode="edit"
        row={{
          ...linkedRow,
          sourceIncomeItemId: null,
          isMonthOnly: true,
          canUpdateDefault: false,
        }}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("This item exists only in the month."),
    ).toBeInTheDocument();
  });

  it("submits the selected budget-plan scope", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <IncomeItemModal
        open
        mode="edit"
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
    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "1700" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amountMonthly: 1700,
          scope: "budgetPlanOnly",
        }),
      );
    });
  });
});
