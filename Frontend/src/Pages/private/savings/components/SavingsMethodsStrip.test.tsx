import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SavingsMethodsStrip from "./SavingsMethodsStrip";
import type { SavingsMethodDto } from "@/types/budget/SavingsMethodDto";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

function row(
  partial: Partial<SavingsMethodDto> & Pick<SavingsMethodDto, "id" | "code">,
): SavingsMethodDto {
  return {
    customLabel: null,
    ...partial,
  };
}

describe("SavingsMethodsStrip", () => {
  it("renders one chip per system method using i18n labels", () => {
    render(
      <SavingsMethodsStrip
        methods={[
          row({ id: "m-1", code: "savings_account" }),
          row({ id: "m-2", code: "isk" }),
          row({ id: "m-3", code: "cash" }),
        ]}
      />,
    );

    expect(screen.getByTestId("savings-methods-strip")).toBeInTheDocument();
    const chips = screen.getAllByTestId("savings-methods-chip");
    expect(chips.map((c) => c.textContent)).toEqual([
      "Savings account",
      "ISK",
      "Cash",
    ]);
  });

  it("renders custom rows verbatim using customLabel", () => {
    render(
      <SavingsMethodsStrip
        methods={[
          row({ id: "m-1", code: "isk" }),
          row({ id: "m-2", code: "custom", customLabel: "Premiepension" }),
          row({ id: "m-3", code: "custom", customLabel: "Avanza ISK" }),
        ]}
      />,
    );

    const chips = screen.getAllByTestId("savings-methods-chip");
    expect(chips.map((c) => c.textContent)).toEqual([
      "ISK",
      "Premiepension",
      "Avanza ISK",
    ]);
  });

  it("uses the localized label as the section heading", () => {
    render(<SavingsMethodsStrip methods={[row({ id: "m-1", code: "isk" })]} />);

    expect(screen.getByTestId("savings-methods-strip")).toHaveAttribute(
      "aria-label",
      "Saving methods",
    );
    expect(screen.getByText("Saving methods")).toBeInTheDocument();
  });

  it("renders an empty-state strip with an add affordance when there are no methods", () => {
    const onEdit = vi.fn();
    render(<SavingsMethodsStrip methods={[]} onEdit={onEdit} />);

    expect(screen.getByTestId("savings-methods-strip")).toBeInTheDocument();
    expect(screen.getByText("No methods added yet")).toBeInTheDocument();
    expect(screen.queryByTestId("savings-methods-chip")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("savings-methods-add-empty-action"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when there are no methods and the month is read-only", () => {
    const { container } = render(
      <SavingsMethodsStrip methods={[]} readOnly onEdit={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByTestId("savings-methods-strip"),
    ).not.toBeInTheDocument();
  });

  it("exposes the Edit action and fires onEdit when methods exist", () => {
    const onEdit = vi.fn();
    render(
      <SavingsMethodsStrip
        methods={[row({ id: "m-1", code: "isk" })]}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByTestId("savings-methods-edit-action"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("hides the Edit action in a read-only month but still shows chips", () => {
    render(
      <SavingsMethodsStrip
        methods={[row({ id: "m-1", code: "isk" })]}
        readOnly
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("savings-methods-chip")).toHaveTextContent("ISK");
    expect(
      screen.queryByTestId("savings-methods-edit-action"),
    ).not.toBeInTheDocument();
  });

  it("drops custom rows whose customLabel is missing or whitespace-only", () => {
    render(
      <SavingsMethodsStrip
        methods={[
          row({ id: "m-1", code: "isk" }),
          row({ id: "m-2", code: "custom", customLabel: "   " }),
          row({ id: "m-3", code: "custom", customLabel: null }),
        ]}
      />,
    );

    const chips = screen.getAllByTestId("savings-methods-chip");
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent("ISK");
  });

  it("drops rows with an unknown code defensively", () => {
    // Cast away the union to simulate a regressed payload arriving from the
    // backend — the strip must not render unknown codes as raw text.
    render(
      <SavingsMethodsStrip
        methods={[
          row({ id: "m-1", code: "isk" }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { id: "m-bad", code: "mystery-method-xyz" as any, customLabel: null },
        ]}
      />,
    );

    const chips = screen.getAllByTestId("savings-methods-chip");
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent("ISK");
  });
});
