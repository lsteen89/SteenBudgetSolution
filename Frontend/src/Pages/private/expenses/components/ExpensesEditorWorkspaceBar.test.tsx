import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExpensesEditorWorkspaceBar from "./ExpensesEditorWorkspaceBar";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "USD",
}));

describe("ExpensesEditorWorkspaceBar", () => {
  it("shows static period context without month-switching arrows", () => {
    render(
      <ExpensesEditorWorkspaceBar
        yearMonthLabel="May 2026"
        incomeTotal={4000}
        expenseTotal={2400}
        remainingTotal={1600}
        onCreate={vi.fn()}
        readOnly={false}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Edit expenses · May 2026" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("editor-period-badge")).toHaveTextContent(
      "May 2026",
    );
    expect(
      screen.queryByRole("button", { name: /previous month/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /next month/i }),
    ).not.toBeInTheDocument();
  });
});
