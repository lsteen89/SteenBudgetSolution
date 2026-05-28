import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ExpenseRowActionsMenu from "./ExpenseRowActionsMenu";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

function renderMenu(
  overrides: Partial<React.ComponentProps<typeof ExpenseRowActionsMenu>> = {},
) {
  const handlers = {
    onEdit: vi.fn(),
    onPauseToggle: vi.fn(),
    onDelete: vi.fn(),
  };

  const user = userEvent.setup();

  render(
    <ExpenseRowActionsMenu
      isActive={true}
      onEdit={handlers.onEdit}
      onPauseToggle={handlers.onPauseToggle}
      onDelete={handlers.onDelete}
      {...overrides}
    />,
  );

  return { ...handlers, user };
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  // Radix dropdown listens for pointer events, not React's synthetic click.
  // userEvent dispatches the right sequence; fireEvent.click does not work.
  await user.click(screen.getByRole("button", { name: /open row actions/i }));
  await waitFor(() => {
    expect(screen.getByRole("menuitem", { name: /edit/i })).toBeInTheDocument();
  });
}

describe("ExpenseRowActionsMenu", () => {
  it("shows Edit, Pause, and Delete by default for an active row", async () => {
    const { user } = renderMenu({ isActive: true });
    await openMenu(user);

    expect(screen.getByRole("menuitem", { name: /edit/i })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /^pause$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /delete/i }),
    ).toBeInTheDocument();
  });

  it("flips the pause label to Resume when the row is inactive", async () => {
    const { user } = renderMenu({ isActive: false });
    await openMenu(user);

    expect(
      screen.getByRole("menuitem", { name: /resume/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /^pause$/i }),
    ).not.toBeInTheDocument();
  });

  it("omits the pause/resume item entirely when canPauseToggle is false", async () => {
    // Lifecycle-paused or lifecycle-cancelled subscriptions disable this
    // action because generic pause/resume only flips isActive — it would not
    // actually resume a lifecycle-paused subscription. Real lifecycle controls
    // ship in PR 4.
    const { user } = renderMenu({ isActive: true, canPauseToggle: false });
    await openMenu(user);

    expect(screen.getByRole("menuitem", { name: /edit/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /^pause$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /resume/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /delete/i }),
    ).toBeInTheDocument();
  });

  it("disables the entire menu trigger in readOnly mode", () => {
    renderMenu({ readOnly: true });

    const trigger = screen.getByRole("button", {
      name: /actions unavailable/i,
    });
    expect(trigger).toBeDisabled();
  });

  it("invokes the correct handler for each item", async () => {
    const handlers = renderMenu({ isActive: true });
    await openMenu(handlers.user);

    await handlers.user.click(
      screen.getByRole("menuitem", { name: /^pause$/i }),
    );
    expect(handlers.onPauseToggle).toHaveBeenCalledTimes(1);
    expect(handlers.onEdit).not.toHaveBeenCalled();
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });
});
