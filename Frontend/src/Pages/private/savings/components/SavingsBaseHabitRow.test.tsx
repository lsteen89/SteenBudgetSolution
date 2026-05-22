import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SavingsBaseHabitRow from "./SavingsBaseHabitRow";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

describe("SavingsBaseHabitRow", () => {
  it("renders the base monthly amount and the NEW tag", () => {
    render(
      <SavingsBaseHabitRow baseMonthly={5000} readOnly={false} onEdit={vi.fn()} />,
    );

    const row = screen.getByTestId("savings-base-habit-row");
    expect(row).toHaveTextContent(/5[\s,.]?000/);
    expect(row).toHaveTextContent(/base savings/i);
    expect(row).toHaveTextContent(/new/i);
  });

  it("calls onEdit when the adjust button is pressed", () => {
    const onEdit = vi.fn();
    render(
      <SavingsBaseHabitRow baseMonthly={5000} readOnly={false} onEdit={onEdit} />,
    );

    fireEvent.click(screen.getByTestId("savings-base-habit-edit-action"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("disables the adjust button on a read-only month", () => {
    render(
      <SavingsBaseHabitRow baseMonthly={5000} readOnly onEdit={vi.fn()} />,
    );

    expect(screen.getByTestId("savings-base-habit-edit-action")).toBeDisabled();
  });
});
