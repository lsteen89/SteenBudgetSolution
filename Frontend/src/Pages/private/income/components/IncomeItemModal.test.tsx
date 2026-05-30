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
  it("shows the month-only callout when creating, never scope cards", () => {
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
      screen.getByTestId("income-item-modal-month-only-callout"),
    ).toHaveTextContent(/Only for May 2026/i);
    expect(
      screen.queryByTestId("income-item-modal-scope-toggle"),
    ).not.toBeInTheDocument();
  });

  it("global add (no presetKind) shows the type selector with the new label", () => {
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

  it("group add (presetKind set) hides the type selector and shows the group subtitle", () => {
    render(
      <IncomeItemModal
        open
        mode="create"
        row={null}
        monthLabel="May 2026"
        presetKind="householdMember"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // Type selector is gone for group add — the kind is already known.
    expect(screen.queryByLabelText("Type of income")).not.toBeInTheDocument();

    // Subtitle copy switches to the group variant.
    expect(
      screen.getByText(
        /Only added to May 2026\. You can add it to the plan later\./i,
      ),
    ).toBeInTheDocument();
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
