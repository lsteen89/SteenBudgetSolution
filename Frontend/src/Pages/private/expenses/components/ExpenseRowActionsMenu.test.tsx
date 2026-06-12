import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ExpenseRowActionsMenu, {
  buildExpenseRowActions,
} from "./ExpenseRowActionsMenu";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

function renderMenu(
  overrides: Partial<React.ComponentProps<typeof ExpenseRowActionsMenu>> = {},
) {
  const handlers = {
    onEdit: vi.fn(),
    onPauseToggle: vi.fn(),
    onLifecycleChange: vi.fn(),
    onDelete: vi.fn(),
  };

  const user = userEvent.setup();

  render(
    <ExpenseRowActionsMenu
      monthLabel="May 2026"
      isActive={true}
      isSubscription={false}
      subscriptionLifecycleStatus={null}
      onEdit={handlers.onEdit}
      onPauseToggle={handlers.onPauseToggle}
      onLifecycleChange={handlers.onLifecycleChange}
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

describe("ExpenseRowActionsMenu (rendering)", () => {
  it("shows Edit, month-specific Pause, and Delete by default for an active non-subscription row", async () => {
    const { user } = renderMenu({ isActive: true, isSubscription: false });
    await openMenu(user);

    expect(screen.getByRole("menuitem", { name: /edit/i })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /pause in may 2026/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /delete/i }),
    ).toBeInTheDocument();
  });

  it("flips the pause label to month-specific Resume when the non-subscription row is inactive", async () => {
    const { user } = renderMenu({ isActive: false, isSubscription: false });
    await openMenu(user);

    expect(
      screen.getByRole("menuitem", { name: /resume in may 2026/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /^pause$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows lifecycle pause + cancel for an active subscription", async () => {
    const { user } = renderMenu({
      isSubscription: true,
      subscriptionLifecycleStatus: "active",
    });
    await openMenu(user);

    expect(
      screen.getByRole("menuitem", {
        name: /pause subscription in may 2026/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /end in may 2026/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /^pause$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows lifecycle resume + cancel for a paused subscription", async () => {
    const { user } = renderMenu({
      isSubscription: true,
      subscriptionLifecycleStatus: "paused",
    });
    await openMenu(user);

    expect(
      screen.getByRole("menuitem", {
        name: /resume subscription in may 2026/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /end in may 2026/i }),
    ).toBeInTheDocument();
  });

  it("shows only reactivate (no pause) for a cancelled subscription", async () => {
    const { user } = renderMenu({
      isSubscription: true,
      subscriptionLifecycleStatus: "cancelled",
    });
    await openMenu(user);

    expect(
      screen.getByRole("menuitem", { name: /reactivate in may 2026/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /pause subscription/i }),
    ).not.toBeInTheDocument();
  });

  it("disables the entire menu trigger in readOnly mode", () => {
    renderMenu({ readOnly: true });

    const trigger = screen.getByRole("button", {
      name: /actions unavailable/i,
    });
    expect(trigger).toBeDisabled();
  });

  it("invokes onPauseToggle for non-subscription pause and not onLifecycleChange", async () => {
    const handlers = renderMenu({ isActive: true, isSubscription: false });
    await openMenu(handlers.user);

    await handlers.user.click(
      screen.getByRole("menuitem", { name: /pause in may 2026/i }),
    );
    expect(handlers.onPauseToggle).toHaveBeenCalledTimes(1);
    expect(handlers.onLifecycleChange).not.toHaveBeenCalled();
    expect(handlers.onEdit).not.toHaveBeenCalled();
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });

  it("invokes onLifecycleChange('paused') when pausing an active subscription", async () => {
    const handlers = renderMenu({
      isSubscription: true,
      subscriptionLifecycleStatus: "active",
    });
    await openMenu(handlers.user);

    await handlers.user.click(
      screen.getByRole("menuitem", {
        name: /pause subscription in may 2026/i,
      }),
    );
    expect(handlers.onLifecycleChange).toHaveBeenCalledWith("paused");
    expect(handlers.onPauseToggle).not.toHaveBeenCalled();
  });

  it("invokes onLifecycleChange('cancelled') when cancelling a subscription", async () => {
    const handlers = renderMenu({
      isSubscription: true,
      subscriptionLifecycleStatus: "active",
    });
    await openMenu(handlers.user);

    await handlers.user.click(
      screen.getByRole("menuitem", { name: /end in may 2026/i }),
    );
    expect(handlers.onLifecycleChange).toHaveBeenCalledWith("cancelled");
  });

  it("invokes onLifecycleChange('active') when reactivating a cancelled subscription", async () => {
    const handlers = renderMenu({
      isSubscription: true,
      subscriptionLifecycleStatus: "cancelled",
    });
    await openMenu(handlers.user);

    await handlers.user.click(
      screen.getByRole("menuitem", { name: /reactivate in may 2026/i }),
    );
    expect(handlers.onLifecycleChange).toHaveBeenCalledWith("active");
  });
});

// Pure helper tests — exercise the action-derivation logic without rendering.
describe("buildExpenseRowActions", () => {
  const labels = {
    edit: "Edit",
    delete: "Delete",
    pause: "Pause",
    resume: "Resume",
    subscriptionPause: "Pause subscription",
    subscriptionResume: "Resume subscription",
    subscriptionCancel: "Cancel subscription",
    subscriptionReactivate: "Reactivate subscription",
  } as const;

  function baseArgs(
    overrides: Partial<Parameters<typeof buildExpenseRowActions>[0]> = {},
  ) {
    return {
      labels,
      monthLabel: "May 2026",
      isActive: true,
      isSubscription: false,
      subscriptionLifecycleStatus: null,
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onPauseToggle: vi.fn(),
      onLifecycleChange: vi.fn(),
      ...overrides,
    } satisfies Parameters<typeof buildExpenseRowActions>[0];
  }

  it("treats null lifecycle on a subscription as active", () => {
    const items = buildExpenseRowActions(
      baseArgs({ isSubscription: true, subscriptionLifecycleStatus: null }),
    );
    expect(items.map((i) => i.key)).toEqual([
      "edit",
      "subscriptionPause",
      "subscriptionCancel",
      "delete",
    ]);
  });

  it("flags the delete action with the danger tone", () => {
    const items = buildExpenseRowActions(baseArgs({}));
    const del = items.find((i) => i.key === "delete")!;
    expect(del.tone).toBe("danger");
  });
});
