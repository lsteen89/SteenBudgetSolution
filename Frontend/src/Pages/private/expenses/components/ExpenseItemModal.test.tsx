import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExpenseItemModal from "./ExpenseItemModal";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "USD",
}));

describe("ExpenseItemModal", () => {
  it("shows the inline amount error when a negative value is submitted", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ExpenseItemModal
        open={true}
        mode="create"
        row={null}
        monthLabel="May 2026"
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Housing",
            code: "housing",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Rent" },
    });
    fireEvent.change(screen.getByLabelText("Amount per month"), {
      target: { value: "-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create entry" }));

    await waitFor(() => {
      expect(screen.getByText("Amount cannot be negative")).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps the amount field and preview money right-aligned and readable", () => {
    render(
      <ExpenseItemModal
        open={true}
        mode="create"
        row={null}
        monthLabel="May 2026"
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Housing",
            code: "housing",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const amountInput = screen.getByLabelText("Amount per month");

    expect(amountInput).toHaveClass("text-right");
    expect(amountInput).toHaveClass("tabular-nums");
    expect(screen.getByTestId("editor-preview-card")).toHaveTextContent(
      "$0.00",
    );
  });

  it("does not expose the future-budget option when creating a month-only item", () => {
    render(
      <ExpenseItemModal
        open={true}
        mode="create"
        row={null}
        monthLabel="May 2026"
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Housing",
            code: "housing",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("radiogroup", {
        name: /what should this change apply to/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows an explicit month-only callout in create mode", () => {
    render(
      <ExpenseItemModal
        open={true}
        mode="create"
        row={null}
        monthLabel="May 2026"
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Housing",
            code: "housing",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const callout = screen.getByTestId(
      "expense-item-modal-month-only-callout",
    );
    expect(callout).toHaveTextContent(
      "Created only for May 2026. It does not change your budget plan.",
    );
  });

  it("hides the month-only callout when editing an existing row", () => {
    render(
      <ExpenseItemModal
        open={true}
        mode="edit"
        monthLabel="May 2026"
        row={{
          id: "22222222-2222-4222-8222-222222222222",
          name: "Streaming",
          categoryId: "11111111-1111-4111-8111-111111111111",
          amountMonthly: 129,
          isActive: true,
          canUpdatePlan: true,
        }}
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Subscription",
            code: "subscription",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId("expense-item-modal-month-only-callout"),
    ).not.toBeInTheDocument();
  });

  it("sends updateDefault=true when an editable row is saved with plan scope", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ExpenseItemModal
        open={true}
        mode="edit"
        monthLabel="May 2026"
        row={{
          id: "22222222-2222-4222-8222-222222222222",
          name: "Streaming",
          categoryId: "11111111-1111-4111-8111-111111111111",
          amountMonthly: 129,
          isActive: true,
          canUpdatePlan: true,
        }}
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Subscription",
            code: "subscription",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Amount per month"), {
      target: { value: "149" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amountMonthly: 149,
          updateDefault: true,
          scope: "currentMonthAndBudgetPlan",
        }),
      );
    });
  });

  it("defaults existing rows to current-month-only and supports budget-plan-only when linked", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ExpenseItemModal
        open={true}
        mode="edit"
        monthLabel="May 2026"
        row={{
          id: "22222222-2222-4222-8222-222222222222",
          name: "Streaming",
          categoryId: "11111111-1111-4111-8111-111111111111",
          amountMonthly: 129,
          isActive: true,
          canUpdatePlan: true,
        }}
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Subscription",
            code: "subscription",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("radio", { name: /only for may 2026/i }),
    ).toHaveAttribute("aria-checked", "true");

    fireEvent.click(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    );

    const previewCard = screen.getByTestId("editor-preview-card");
    // The eyebrow flips to "Current month — unchanged" and the preview
    // headline shows the original row values (not the user's edits), so the
    // user cannot misread the preview as "what the current month will show
    // after I save".
    expect(previewCard).toHaveTextContent(/current month\s*[—-]\s*unchanged/i);
    expect(previewCard).toHaveTextContent("Streaming");
    expect(previewCard).toHaveTextContent(/remains unchanged/i);
    expect(previewCard).toHaveTextContent(/budget plan forward/i);
    expect(previewCard).toHaveTextContent(/receives the edited values/i);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          updateDefault: false,
          scope: "budgetPlanOnly",
        }),
      );
    });
  });

  it("disables budget-plan scopes for month-only rows", () => {
    render(
      <ExpenseItemModal
        open={true}
        mode="edit"
        monthLabel="May 2026"
        row={{
          id: "22222222-2222-4222-8222-222222222222",
          name: "Groceries",
          categoryId: "11111111-1111-4111-8111-111111111111",
          amountMonthly: 300,
          isActive: true,
          canUpdatePlan: false,
        }}
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Food",
            code: "food",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        /This row only exists in May 2026\. Future-plan changes are not available\./,
      ),
    ).toBeInTheDocument();
  });
});
