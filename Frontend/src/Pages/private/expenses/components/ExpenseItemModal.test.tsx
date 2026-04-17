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
        categories={[
          {
            id: "11111111-1111-1111-1111-111111111111",
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
});
