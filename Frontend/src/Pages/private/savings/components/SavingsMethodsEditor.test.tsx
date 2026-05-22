import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SavingsMethodsEditor from "./SavingsMethodsEditor";
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

type Overrides = Partial<React.ComponentProps<typeof SavingsMethodsEditor>>;

function renderEditor(overrides: Overrides = {}) {
  const props: React.ComponentProps<typeof SavingsMethodsEditor> = {
    open: true,
    methods: [],
    isAdding: false,
    removingId: null,
    errorMessage: null,
    onAdd: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<SavingsMethodsEditor {...props} />);
  return props;
}

describe("SavingsMethodsEditor", () => {
  it("does not render when closed", () => {
    renderEditor({ open: false });
    expect(
      screen.queryByTestId("savings-methods-editor"),
    ).not.toBeInTheDocument();
  });

  it("renders the title and scope helper line", () => {
    renderEditor();
    expect(screen.getByText("Manage saving methods")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Saving methods apply to the whole plan, not individual goals.",
      ),
    ).toBeInTheDocument();
  });

  it("offers every unused system code as a suggestion and adds it on click", () => {
    const props = renderEditor({ methods: [] });

    const suggestions = screen.getAllByTestId("savings-methods-suggestion");
    expect(suggestions.map((s) => s.getAttribute("data-code"))).toEqual([
      "savings_account",
      "isk",
      "funds",
      "cash",
    ]);

    fireEvent.click(suggestions[1]);
    expect(props.onAdd).toHaveBeenCalledWith({ code: "isk", customLabel: null });
  });

  it("hides a system code suggestion once that method is on the plan", () => {
    renderEditor({ methods: [row({ id: "m-1", code: "isk" })] });

    const codes = screen
      .getAllByTestId("savings-methods-suggestion")
      .map((s) => s.getAttribute("data-code"));
    expect(codes).not.toContain("isk");
    expect(codes).toContain("savings_account");
  });

  it("adds a trimmed custom method from the input", () => {
    const props = renderEditor();

    const input = screen.getByPlaceholderText("e.g. Emergency fund");
    fireEvent.change(input, { target: { value: "  Avanza buffert  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(props.onAdd).toHaveBeenCalledWith({
      code: "custom",
      customLabel: "Avanza buffert",
    });
  });

  it("does not add a blank custom method", () => {
    const props = renderEditor();

    const input = screen.getByPlaceholderText("e.g. Emergency fund");
    fireEvent.change(input, { target: { value: "    " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(props.onAdd).not.toHaveBeenCalled();
  });

  it("lists current methods and removes one on click", () => {
    const props = renderEditor({
      methods: [
        row({ id: "m-1", code: "isk" }),
        row({ id: "m-2", code: "custom", customLabel: "Premiepension" }),
      ],
    });

    const removeButtons = screen.getAllByTestId("savings-methods-remove");
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[1]);
    expect(props.onRemove).toHaveBeenCalledWith("m-2", "Premiepension");
  });

  it("shows the empty current-list state when there are no methods", () => {
    renderEditor({ methods: [] });
    expect(screen.getByText("No methods added yet.")).toBeInTheDocument();
  });

  it("surfaces an error message when one is supplied", () => {
    renderEditor({ errorMessage: "Could not add the saving method." });
    expect(
      screen.getByTestId("savings-methods-editor-error"),
    ).toHaveTextContent("Could not add the saving method.");
  });

  it("disables the suggestion buttons while an add is in flight", () => {
    renderEditor({ isAdding: true });
    for (const button of screen.getAllByTestId("savings-methods-suggestion")) {
      expect(button).toBeDisabled();
    }
  });
});
