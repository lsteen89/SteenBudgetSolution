import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import EditScopeToggle from "./EditScopeToggle";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

describe("EditScopeToggle", () => {
  it("renders both options and marks the selected one", () => {
    render(
      <EditScopeToggle
        value="month"
        onChange={() => {}}
        monthLabel="April 2026"
      />,
    );

    const monthOption = screen.getByRole("radio", {
      name: /Only for April 2026/i,
    });
    const planOption = screen.getByRole("radio", {
      name: /Update the ongoing budget plan/i,
    });

    expect(monthOption).toHaveAttribute("aria-checked", "true");
    expect(planOption).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with the selected scope when clicked", () => {
    const onChange = vi.fn();
    render(
      <EditScopeToggle
        value="month"
        onChange={onChange}
        monthLabel="April 2026"
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", { name: /Update the ongoing budget plan/i }),
    );

    expect(onChange).toHaveBeenCalledWith("plan");
  });

  it("disables the plan option when canUpdatePlan is false", () => {
    render(
      <EditScopeToggle
        value="month"
        onChange={() => {}}
        monthLabel="April 2026"
        canUpdatePlan={false}
        disabledPlanHint="No plan rows to update"
      />,
    );

    const planOption = screen.getByRole("radio", {
      name: /Update the ongoing budget plan/i,
    });
    expect(planOption).toBeDisabled();
    expect(screen.getByText("No plan rows to update")).toBeInTheDocument();
  });

  it("falls back to month scope when the plan option becomes disabled while selected", () => {
    const onChange = vi.fn();

    render(
      <EditScopeToggle
        value="plan"
        onChange={onChange}
        monthLabel="April 2026"
        canUpdatePlan={false}
      />,
    );

    expect(onChange).toHaveBeenCalledWith("month");
  });
});
