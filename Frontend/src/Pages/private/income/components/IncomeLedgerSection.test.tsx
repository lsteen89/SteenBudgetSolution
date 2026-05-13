import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import IncomeLedgerSection from "./IncomeLedgerSection";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "USD",
}));

const row = {
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

describe("IncomeLedgerSection", () => {
  it("uses the shared row action menu pattern", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <IncomeLedgerSection
        rows={[row]}
        total={1500}
        readOnly={false}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const actionButtons = screen.getAllByRole("button", {
      name: "Open row actions",
    });
    expect(actionButtons.length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });
});
