import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import IncomeItemModal from "./IncomeItemModal";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
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
  sourceName: null,
  sourceAmountMonthly: null,
  sourceIsActive: null,
};

const salaryRow = {
  id: "55555555-5555-4555-8555-555555555555",
  sourceIncomeItemId: "66666666-6666-4666-8666-666666666666",
  kind: "salary" as const,
  name: "Net salary",
  amountMonthly: 32000,
  isActive: true,
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
  sourceName: null,
  sourceAmountMonthly: null,
  sourceIsActive: null,
};

describe("IncomeItemModal", () => {
  it("create mode renders the two-card scope selector and no static month-only callout", () => {
    // The old static "Skapas bara i {month}" callout has been replaced by
    // a real scope choice. The two-card create scope selector must always
    // be present in create mode (regardless of group vs hero add), and
    // the three-card edit scope selector must NOT appear in create mode.
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

    expect(
      screen.getByTestId("income-item-modal-create-scope"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("income-item-modal-month-only-callout"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("income-item-modal-scope-toggle"),
    ).not.toBeInTheDocument();
  });

  it("create mode defaults to currentMonthAndBudgetPlan (income is usually recurring)", () => {
    // Default selection is the recurring choice — month-only must be an
    // explicit, intentional alternative the user reaches for, not the
    // accidental default.
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

    const recurring = screen.getByRole("radio", {
      name: /Also add to the budget plan going forward/i,
    });
    const monthOnly = screen.getByRole("radio", { name: /Only for May 2026/i });
    expect(recurring).toHaveAttribute("aria-checked", "true");
    expect(monthOnly).toHaveAttribute("aria-checked", "false");
  });

  it("create mode: user can switch the scope to month-only", () => {
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

    const monthOnly = screen.getByRole("radio", { name: /Only for May 2026/i });
    fireEvent.click(monthOnly);
    expect(monthOnly).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("radio", {
        name: /Also add to the budget plan going forward/i,
      }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("create submit sends the default recurring scope", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <IncomeItemModal
        open
        mode="create"
        row={null}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Recurring weekend job" },
    });
    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "1200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        mode: "create",
        kind: "sideHustle",
        name: "Recurring weekend job",
        amountMonthly: 1200,
        isActive: true,
        scope: "currentMonthAndBudgetPlan",
      });
    });
  });

  it("create submit sends currentMonthOnly when the user picks month-only", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <IncomeItemModal
        open
        mode="create"
        row={null}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "One-off gig" },
    });
    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "750" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /Only for May 2026/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "create",
          scope: "currentMonthOnly",
        }),
      );
    });
  });

  it("hero-level add (no presetKind) shows the type selector with sideHustle default", () => {
    // Hero CTA opens the drawer without a known kind. The user picks the
    // type inside the modal; the default is `sideHustle`.
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

    const select = screen.getByLabelText("Type of income") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("sideHustle");
  });

  it("hero-level add: user can switch to householdMember and it submits with that kind", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <IncomeItemModal
        open
        mode="create"
        row={null}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Type of income"), {
      target: { value: "householdMember" },
    });
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Partner contribution" },
    });
    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "create",
          kind: "householdMember",
        }),
      );
    });
  });

  it("section-level add (presetKind set) hides the type selector and preselects the kind", async () => {
    // The group's `Lägg till` button passes its `kind` through as
    // `presetKind`. The drawer must then hide the type selector — the
    // kind is already known — and submit with that exact kind.
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <IncomeItemModal
        open
        mode="create"
        row={null}
        monthLabel="May 2026"
        presetKind="householdMember"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByLabelText("Type of income")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Sibling contribution" },
    });
    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "create",
          kind: "householdMember",
        }),
      );
    });
  });

  it("create preview shows the recurring scope line by default and switches with the scope cards", () => {
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

    const previewScope = screen.getByTestId("income-item-modal-preview-scope");
    expect(previewScope).toHaveTextContent(/Recurring in the budget plan/i);

    fireEvent.click(
      screen.getByRole("radio", { name: /Only for May 2026/i }),
    );
    expect(previewScope).toHaveTextContent(/This month only/i);
  });

  it("create preview keeps scope independent of the current-month active toggle", () => {
    // Scope = "is this part of the plan?". Active toggle = "does it count
    // in THIS month?". They must not collapse: a recurring row that's
    // off for this month still reads as recurring in the preview.
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

    // Default state: recurring + active.
    expect(
      screen.getByTestId("income-item-modal-preview-scope"),
    ).toHaveTextContent(/Recurring in the budget plan/i);

    fireEvent.click(screen.getByTestId("income-item-modal-active-toggle"));

    // After turning the active toggle off, the main status line moves to
    // "Inactive this month" but the scope line stays recurring.
    const preview = screen.getByTestId("editor-preview-card");
    expect(
      within(preview).getByText(/Inactive this month/i),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("income-item-modal-preview-scope"),
    ).toHaveTextContent(/Recurring in the budget plan/i);
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
    const updatePlan = screen.getByRole("radio", {
      name: /update the budget plan going forward/i,
    });
    const planOnly = screen.getByRole("radio", {
      name: /budget plan going forward only/i,
    });
    expect(updatePlan).not.toBeDisabled();
    expect(planOnly).not.toBeDisabled();
  });

  it("disables plan-writing scopes on month-only rows and shows the handover hint", () => {
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

    // currentMonthOnly stays selectable; the two plan-writing cards are
    // visible but disabled so the reader can see the option exists for
    // plan-linked rows even though it is not available here.
    expect(
      screen.getByRole("radio", { name: /only for may 2026/i }),
    ).not.toBeDisabled();
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

    // The disabled hint reads as the handover-approved copy (no
    // `baseline` / `source` / `plan row` / `linked` words).
    expect(
      screen.getByText(
        /Unavailable — this row does not exist in the plan\./i,
      ),
    ).toBeInTheDocument();
  });

  it("salary edit: name is readOnly with the locked-name hint", () => {
    render(
      <IncomeItemModal
        open
        mode="edit"
        row={salaryRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    expect(nameInput).toHaveAttribute("readonly");
    expect(nameInput.value).toBe("Net salary");
    expect(
      screen.getByTestId("income-item-modal-salary-name-hint"),
    ).toHaveTextContent(/Your salary name cannot be changed\./i);
  });

  it("salary edit: active toggle is locked-on with the always-active hint", () => {
    render(
      <IncomeItemModal
        open
        mode="edit"
        row={salaryRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const toggle = screen.getByTestId("income-item-modal-active-toggle");
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByTestId("income-item-modal-salary-active-hint"),
    ).toHaveTextContent(/Your salary is always active\./i);
  });

  it("salary edit: omits scope cards entirely", () => {
    render(
      <IncomeItemModal
        open
        mode="edit"
        row={salaryRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId("income-item-modal-scope-toggle"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Unavailable — this row does not exist/i),
    ).not.toBeInTheDocument();
  });

  it("salary edit: submits always-active and no scope, even if the local toggle was bypassed", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <IncomeItemModal
        open
        mode="edit"
        row={salaryRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "33500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      // Salary edit must NOT carry `kind` on the wire — the patch endpoint
      // ignores it and any value here would lie about the row. The
      // discriminated `mode: "edit"` shape drops it entirely.
      expect(onSubmit).toHaveBeenCalledWith({
        mode: "edit",
        name: "Net salary",
        amountMonthly: 33500,
        isActive: true,
        scope: undefined,
      });
    });
  });

  it("renders the live preview block reflecting the in-progress form values", () => {
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

    const preview = screen.getByTestId("editor-preview-card");
    expect(within(preview).getByText("Preview")).toBeInTheDocument();
    expect(within(preview).getByText("Consulting")).toBeInTheDocument();
    expect(within(preview).getByText("Side income")).toBeInTheDocument();
    expect(within(preview).getByText(/Counts in May 2026/i)).toBeInTheDocument();
  });

  it("preview goes to the inactive copy when the user toggles the row off", () => {
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

    fireEvent.click(
      screen.getByTestId("income-item-modal-active-toggle"),
    );

    const preview = screen.getByTestId("editor-preview-card");
    expect(
      within(preview).getByText(/Inactive this month/i),
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
          mode: "edit",
          amountMonthly: 1700,
          scope: "budgetPlanOnly",
        }),
      );
    });
    // Edit payloads must never carry `kind` — assert it explicitly so a
    // regression that re-adds it is caught.
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).not.toHaveProperty("kind");
  });
});
