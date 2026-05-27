import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import SavingsGoalActionRow from "./SavingsGoalActionRow";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

const row: BudgetMonthSavingsGoalEditorRowDto = {
  id: "row-1",
  sourceSavingsGoalId: "src-1",
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

const renderRow = (
  override: Partial<React.ComponentProps<typeof SavingsGoalActionRow>> = {},
) => {
  const props: React.ComponentProps<typeof SavingsGoalActionRow> = {
    row,
    readOnly: false,
    baselineSupported: true,
    onDeposit: vi.fn(),
    onMonthly: vi.fn(),
    onTargetDate: vi.fn(),
    onRename: vi.fn(),
    onChangeTarget: vi.fn(),
    onArchive: vi.fn(),
    onRemove: vi.fn(),
  };
  return render(<SavingsGoalActionRow {...props} {...override} />);
};

describe("SavingsGoalActionRow", () => {
  it("renders chips in the V2 order", () => {
    renderRow();

    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toEqual([
      "Deposit",
      "Monthly amount",
      "Target date",
      "",
    ]);
  });

  it("fires the deposit handler on click in an active row", () => {
    const onDeposit = vi.fn();
    renderRow({ onDeposit });

    const deposit = screen.getByRole("button", { name: /deposit/i });
    expect(deposit).not.toHaveAttribute("aria-disabled", "true");
    fireEvent.click(deposit);
    expect(onDeposit).toHaveBeenCalledTimes(1);
  });

  it("disables the deposit chip in read-only mode", () => {
    const onDeposit = vi.fn();
    renderRow({ readOnly: true, onDeposit });

    const deposit = screen.getByRole("button", { name: /deposit/i });
    expect(deposit).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(deposit);
    expect(onDeposit).not.toHaveBeenCalled();
  });

  it("keeps the kebab Snart items disabled until PR-10", () => {
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: /more/i }));
    const rename = screen.getByRole("menuitem", { name: /rename/i });
    expect(rename).toHaveAttribute("aria-disabled", "true");
    expect(rename).toHaveAttribute("title", "Soon");
  });

  it("disables active chips in read-only mode", () => {
    const onMonthly = vi.fn();
    renderRow({ readOnly: true, onMonthly });

    const monthly = screen.getByRole("button", { name: /monthly amount/i });
    expect(monthly).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(monthly);
    expect(onMonthly).not.toHaveBeenCalled();
  });

  it("opens the kebab and chooses lifecycle actions", () => {
    const onArchive = vi.fn();
    renderRow({ onArchive });

    fireEvent.click(screen.getByRole("button", { name: /more/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /archive goal/i }));

    expect(onArchive).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the kebab on outside click and Escape", () => {
    renderRow();

    fireEvent.click(screen.getByRole("button", { name: /more/i }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /more/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes another row's kebab when a second row opens", () => {
    const first = { ...row, id: "row-1" };
    const second = { ...row, id: "row-2", name: "Trip" };
    render(
      <div>
        <SavingsGoalActionRow
          row={first}
          readOnly={false}
          baselineSupported
          onDeposit={vi.fn()}
          onMonthly={vi.fn()}
          onTargetDate={vi.fn()}
          onRename={vi.fn()}
          onChangeTarget={vi.fn()}
          onArchive={vi.fn()}
          onRemove={vi.fn()}
        />
        <SavingsGoalActionRow
          row={second}
          readOnly={false}
          baselineSupported
          onDeposit={vi.fn()}
          onMonthly={vi.fn()}
          onTargetDate={vi.fn()}
          onRename={vi.fn()}
          onChangeTarget={vi.fn()}
          onArchive={vi.fn()}
          onRemove={vi.fn()}
        />
      </div>,
    );

    const moreButtons = screen.getAllByRole("button", { name: /more/i });
    fireEvent.click(moreButtons[0]);
    expect(screen.getAllByRole("menu")).toHaveLength(1);
    fireEvent.click(moreButtons[1]);
    expect(screen.getAllByRole("menu")).toHaveLength(1);
  });
});
