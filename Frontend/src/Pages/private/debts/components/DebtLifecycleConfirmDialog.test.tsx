import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DebtLifecycleConfirmDialog, {
  type DebtLifecycleAction,
} from "./DebtLifecycleConfirmDialog";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "sv-SE",
}));

function renderDialog(
  action: DebtLifecycleAction,
  overrides: Partial<React.ComponentProps<typeof DebtLifecycleConfirmDialog>> = {},
) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <DebtLifecycleConfirmDialog
      open
      action={action}
      debtName="Privatlån"
      yearMonthLabel="maj 2026"
      isWorking={false}
      onConfirm={onConfirm}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onConfirm, onClose };
}

describe("DebtLifecycleConfirmDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <DebtLifecycleConfirmDialog
        open={false}
        action="skip"
        debtName="Privatlån"
        yearMonthLabel="maj 2026"
        isWorking={false}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("debt-lifecycle-confirm")).not.toBeInTheDocument();
  });

  it("skip confirmation states the balance is still owed and the action is reversible", () => {
    renderDialog("skip");
    const body = screen.getByText(/Saldot står kvar/i);
    expect(body).toBeInTheDocument();
    expect(body).toHaveTextContent(/fortfarande skyldig/i);
    expect(body).toHaveTextContent(/inkludera den igen/i);
  });

  it("include confirmation states the balance is unchanged", () => {
    renderDialog("include");
    expect(screen.getByText(/Saldot är oförändrat/i)).toBeInTheDocument();
  });

  it("paid-off confirmation never claims a real payment was recorded and offers an opt-in balance-zero", () => {
    renderDialog("markPaidOff");
    expect(
      screen.getByText(/ingen faktisk betalning registreras/i),
    ).toBeInTheDocument();
    const zero = screen.getByTestId("debt-lifecycle-set-balance-zero");
    // Opt-in: a status change must not silently move the liability.
    expect(zero).not.toBeChecked();
  });

  it("archive confirmation says hidden, not deleted, and that it is restorable", () => {
    renderDialog("archive");
    const body = screen.getByText(/döljs från den vanliga planeringen/i);
    expect(body).toBeInTheDocument();
    expect(body).toHaveTextContent(/återställa skulden/i);
  });

  it("restore confirmation defaults to re-including the current month", () => {
    renderDialog("restore");
    const reinclude = screen.getByTestId("debt-lifecycle-reinclude");
    expect(reinclude).toBeChecked();
  });

  it("remove uses destructive styling and has no secondary checkbox", () => {
    renderDialog("remove");
    const confirm = screen.getByTestId("debt-lifecycle-confirm-action");
    expect(confirm).toHaveAttribute("data-tone", "danger");
    expect(
      screen.queryByTestId("debt-lifecycle-set-balance-zero"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("debt-lifecycle-reinclude"),
    ).not.toBeInTheDocument();
  });

  it("passes setBalanceToZero through when the user opts in on mark-paid-off", () => {
    const { onConfirm } = renderDialog("markPaidOff");
    fireEvent.click(screen.getByTestId("debt-lifecycle-set-balance-zero"));
    fireEvent.click(screen.getByTestId("debt-lifecycle-confirm-action"));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ setBalanceToZero: true }),
    );
  });

  it("passes reIncludeCurrentMonth=false when the user unticks it on restore", () => {
    const { onConfirm } = renderDialog("restore");
    fireEvent.click(screen.getByTestId("debt-lifecycle-reinclude"));
    fireEvent.click(screen.getByTestId("debt-lifecycle-confirm-action"));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ reIncludeCurrentMonth: false }),
    );
  });

  it("disables the confirm and cancel buttons while working", () => {
    renderDialog("skip", { isWorking: true });
    expect(screen.getByTestId("debt-lifecycle-confirm-action")).toBeDisabled();
  });
});
