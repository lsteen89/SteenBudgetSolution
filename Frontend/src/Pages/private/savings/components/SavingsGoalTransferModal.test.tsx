import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import type { SavingsMethodDto } from "@/types/budget/SavingsMethodDto";
import SavingsGoalTransferModal from "./SavingsGoalTransferModal";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const baseRow: BudgetMonthSavingsGoalEditorRowDto = {
  id: "11111111-1111-4111-8111-111111111111",
  sourceSavingsGoalId: "22222222-2222-4222-8222-222222222222",
  name: "Emergency fund",
  targetAmount: 50000,
  targetDate: "2030-12-31",
  amountSaved: 10000,
  monthlyContribution: 1500,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

const methods: SavingsMethodDto[] = [
  { id: "m-1", code: "savings_account" },
  { id: "m-2", code: "isk" },
];

function renderModal(
  override: Partial<React.ComponentProps<typeof SavingsGoalTransferModal>> = {},
) {
  const props: React.ComponentProps<typeof SavingsGoalTransferModal> = {
    open: true,
    row: baseRow,
    monthLabel: "May 2026",
    methods,
    isSaving: false,
    errorMessage: null,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  };
  return render(<SavingsGoalTransferModal {...props} {...override} />);
}

describe("SavingsGoalTransferModal", () => {
  it("renders the snapshot with saved, target and deadline", () => {
    renderModal();
    const snapshot = screen.getByTestId("savings-goal-modal-snapshot");
    expect(snapshot).toHaveTextContent(/saved/i);
    expect(snapshot).toHaveTextContent(/target/i);
    expect(snapshot).toHaveTextContent(/target date/i);
  });

  it("submits a deposit with the structured counterAccount note", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSubmit });

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "750" },
    });
    fireEvent.click(screen.getByTestId("savings-goal-transfer-save"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      amount: 750,
      direction: "deposit",
      note: "counterAccount: Savings account",
    });
  });

  it("submits a withdrawal with the chosen counter account", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSubmit });

    fireEvent.click(
      screen.getByTestId("savings-goal-transfer-direction-withdraw"),
    );
    fireEvent.change(screen.getByTestId("savings-goal-transfer-source"), {
      target: { value: "m-2" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByTestId("savings-goal-transfer-save"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      amount: 200,
      direction: "withdraw",
      note: "counterAccount: ISK",
    });
  });

  it("blocks a withdrawal that would push AmountSaved below zero", () => {
    const onSubmit = vi.fn();
    renderModal({ onSubmit });

    fireEvent.click(
      screen.getByTestId("savings-goal-transfer-direction-withdraw"),
    );
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "12000" },
    });

    expect(
      screen.getByTestId("savings-goal-transfer-withdraw-warning"),
    ).toHaveTextContent(/Only/i);

    const save = screen.getByTestId("savings-goal-transfer-save");
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables Save while saving and shows the saving label", () => {
    renderModal({ isSaving: true });
    const save = screen.getByTestId("savings-goal-transfer-save");
    expect(save).toBeDisabled();
    expect(save).toHaveTextContent(/saving/i);
  });

  it("surfaces the BE error message when supplied", () => {
    renderModal({ errorMessage: "Server says no" });
    expect(screen.getByTestId("savings-goal-transfer-error")).toHaveTextContent(
      "Server says no",
    );
  });

  it("appends the user note to the structured counterAccount prefix", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSubmit });

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText(/note/i), {
      target: { value: "Side job paycheck" },
    });
    fireEvent.click(screen.getByTestId("savings-goal-transfer-save"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      amount: 500,
      direction: "deposit",
      note: "counterAccount: Savings account · Side job paycheck",
    });
  });

  it("fires onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId("savings-goal-transfer-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on backdrop click while saving", () => {
    const onClose = vi.fn();
    renderModal({ onClose, isSaving: true });
    fireEvent.click(screen.getByTestId("savings-goal-transfer-backdrop"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("blocks submit and surfaces the source-required error when methods are empty", () => {
    const onSubmit = vi.fn();
    renderModal({ methods: [], onSubmit });

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByTestId("savings-goal-transfer-save"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("savings-goal-transfer-source"),
    ).toBeDisabled();
  });

  it("resets the source pick when a methods refetch drops the current id", () => {
    const { rerender } = renderModal();
    const select = screen.getByTestId(
      "savings-goal-transfer-source",
    ) as HTMLSelectElement;

    // User picks ISK.
    fireEvent.change(select, { target: { value: "m-2" } });
    expect(select.value).toBe("m-2");

    // Methods refetch drops ISK. The effect must reset to the new head
    // option so the audit note never carries the stale id.
    rerender(
      <SavingsGoalTransferModal
        open={true}
        row={baseRow}
        monthLabel="May 2026"
        methods={[{ id: "m-1", code: "savings_account" }]}
        isSaving={false}
        errorMessage={null}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(
      (screen.getByTestId("savings-goal-transfer-source") as HTMLSelectElement)
        .value,
    ).toBe("m-1");
  });
});
