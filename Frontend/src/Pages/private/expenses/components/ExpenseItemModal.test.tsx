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
    // Preview money is display money: whole units, no decimals (task 2).
    expect(screen.getByTestId("editor-preview-card")).toHaveTextContent("$0");
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
          // PR 5/6 source-plan values. Production rows with canUpdatePlan
          // always carry source values, so the test exercises the plan-
          // aware preview branch the user will actually see.
          sourceName: "Streaming",
          sourceCategoryId: "11111111-1111-4111-8111-111111111111",
          sourceAmountMonthly: 129,
          sourceIsActive: true,
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

  it("plan-aware preview shows new amount on the editing column and source amount on the unchanged column", () => {
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
          sourceName: "Streaming",
          sourceCategoryId: "11111111-1111-4111-8111-111111111111",
          sourceAmountMonthly: 100,
          sourceIsActive: true,
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

    // Type a new amount, stay on the default scope (currentMonthOnly).
    fireEvent.change(screen.getByLabelText("Amount per month"), {
      target: { value: "150" },
    });

    const currentCol = screen.getByTestId(
      "expense-item-modal-plan-preview-current",
    );
    const planCol = screen.getByTestId(
      "expense-item-modal-plan-preview-plan",
    );

    // currentMonthOnly: current column receives the edit ($150), plan
    // column keeps the source value ($100) and is labelled unchanged.
    expect(currentCol).toHaveTextContent("$150");
    expect(currentCol).toHaveTextContent(/receives the edited values/i);
    expect(planCol).toHaveTextContent("$100");
    expect(planCol).toHaveTextContent(/remains unchanged/i);

    // Switching to plan-only flips which column is unchanged.
    fireEvent.click(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    );
    expect(currentCol).toHaveTextContent("$129"); // row.amountMonthly
    expect(currentCol).toHaveTextContent(/remains unchanged/i);
    expect(planCol).toHaveTextContent("$150"); // user's edit
    expect(planCol).toHaveTextContent(/receives the edited values/i);

    // currentMonthAndBudgetPlan writes both surfaces.
    fireEvent.click(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    );
    expect(currentCol).toHaveTextContent("$150");
    expect(planCol).toHaveTextContent("$150");
    expect(currentCol).toHaveTextContent(/receives the edited values/i);
    expect(planCol).toHaveTextContent(/receives the edited values/i);
  });

  it("hides the plan-aware preview for month-only rows", () => {
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
          // Month-only row: source values are null.
          sourceName: null,
          sourceCategoryId: null,
          sourceAmountMonthly: null,
          sourceIsActive: null,
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
      screen.queryByTestId("expense-item-modal-plan-preview"),
    ).not.toBeInTheDocument();
  });

  it("shows the lifecycle section only when the selected category is a subscription", () => {
    const { rerender } = render(
      <ExpenseItemModal
        open={true}
        mode="create"
        row={null}
        monthLabel="May 2026"
        categories={[
          {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Food",
            code: "food",
          },
          {
            id: "44444444-4444-4444-8444-444444444444",
            name: "Subscription",
            code: "subscription",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // Default category is Food → no lifecycle section.
    expect(
      screen.queryByTestId("expense-item-modal-lifecycle-section"),
    ).not.toBeInTheDocument();

    // Switching to Subscription reveals it.
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "44444444-4444-4444-8444-444444444444" },
    });

    expect(
      screen.getByTestId("expense-item-modal-lifecycle-section"),
    ).toBeInTheDocument();

    // And going back hides it again.
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "33333333-3333-4333-8333-333333333333" },
    });
    expect(
      screen.queryByTestId("expense-item-modal-lifecycle-section"),
    ).not.toBeInTheDocument();

    rerender(<></>);
  });

  it("submits null subscriptionLifecycleStatus for non-subscription rows", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ExpenseItemModal
        open={true}
        mode="create"
        row={null}
        monthLabel="May 2026"
        categories={[
          {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Food",
            code: "food",
          },
        ]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Groceries" },
    });
    fireEvent.change(screen.getByLabelText("Amount per month"), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create entry" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionLifecycleStatus: null,
        }),
      );
    });
  });

  it("preloads the lifecycle segmented control from the edited subscription row", () => {
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
          subscriptionLifecycleStatus: "paused",
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
      screen.getByTestId("expense-item-modal-lifecycle-paused"),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByTestId("expense-item-modal-lifecycle-active"),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("submits the selected lifecycle when editing a subscription", async () => {
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
          subscriptionLifecycleStatus: "active",
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

    fireEvent.click(screen.getByTestId("expense-item-modal-lifecycle-cancelled"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionLifecycleStatus: "cancelled",
        }),
      );
    });
  });

  it("treats null lifecycle on a subscription row as 'active' in the segmented control", () => {
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
          subscriptionLifecycleStatus: null,
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
      screen.getByTestId("expense-item-modal-lifecycle-active"),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("disables the lifecycle control when scope is budgetPlanOnly and reverts the submitted value", async () => {
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
          subscriptionLifecycleStatus: "active",
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

    // First: try to change lifecycle to paused.
    fireEvent.click(screen.getByTestId("expense-item-modal-lifecycle-paused"));
    expect(
      screen.getByTestId("expense-item-modal-lifecycle-paused"),
    ).toHaveAttribute("aria-checked", "true");

    // Then: pick budget-plan-only. Lifecycle radios must become disabled
    // and the hint must explain the rule.
    fireEvent.click(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    );

    expect(
      screen.getByTestId("expense-item-modal-lifecycle-active"),
    ).toBeDisabled();
    expect(
      screen.getByTestId("expense-item-modal-lifecycle-paused"),
    ).toBeDisabled();
    expect(
      screen.getByTestId("expense-item-modal-lifecycle-cancelled"),
    ).toBeDisabled();
    expect(
      screen.getByTestId("expense-item-modal-lifecycle-hint"),
    ).toHaveTextContent(/only applies to May 2026/i);

    // The visible selection must match what the wire payload will carry,
    // not the stale pre-disable choice. The row's lifecycle is "active",
    // so the Active radio must be the one marked checked while the
    // control is disabled.
    expect(
      screen.getByTestId("expense-item-modal-lifecycle-active"),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByTestId("expense-item-modal-lifecycle-paused"),
    ).toHaveAttribute("aria-checked", "false");

    // Switching back to a writing scope should restore the user's
    // earlier "Paused" pick so they don't have to reselect it.
    fireEvent.click(
      screen.getByRole("radio", { name: /only for may 2026/i }),
    );
    expect(
      screen.getByTestId("expense-item-modal-lifecycle-paused"),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByTestId("expense-item-modal-lifecycle-active"),
    ).toHaveAttribute("aria-checked", "false");

    // And back to budgetPlanOnly to verify the submit guard from here.
    fireEvent.click(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    );

    // Submit. Even though the user clicked "Paused" earlier, the wire
    // payload must carry the row's original lifecycle so the backend
    // doesn't silently drop the user's intent. Backend writes lifecycle
    // only when the current month is written; budgetPlanOnly does not
    // write the current month.
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: "budgetPlanOnly",
          subscriptionLifecycleStatus: "active",
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

  it("prompts to discard when only the subscription lifecycle has changed", () => {
    const onClose = vi.fn();

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
          subscriptionLifecycleStatus: "active",
          canUpdatePlan: true,
        }}
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Subscription",
            code: "subscription",
          },
        ]}
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );

    // Touch only lifecycle. RHF `isDirty` stays false because no form-owned
    // field changed; the modal-level dirty flag must still catch this.
    fireEvent.click(screen.getByTestId("expense-item-modal-lifecycle-paused"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Discard changes?")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("prompts to discard when only the edit scope has changed", () => {
    const onClose = vi.fn();

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
          canUpdatePlan: true,
        }}
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Food",
            code: "food",
          },
        ]}
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Discard changes?")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without a prompt when no field, scope, or lifecycle changed", () => {
    const onClose = vi.fn();

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
          subscriptionLifecycleStatus: "paused",
          canUpdatePlan: true,
        }}
        categories={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Subscription",
            code: "subscription",
          },
        ]}
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
