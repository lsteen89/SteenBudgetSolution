import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SavingsGoalDraftCard from "./SavingsGoalDraftCard";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

describe("SavingsGoalDraftCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const buildProps = (override: Partial<React.ComponentProps<typeof SavingsGoalDraftCard>> = {}) => ({
    isSubmitting: false,
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    ...override,
  });

  it("shows schema-aligned errors when required fields are missing", () => {
    const onSubmit = vi.fn();
    render(<SavingsGoalDraftCard {...buildProps({ onSubmit })} />);

    fireEvent.click(screen.getByTestId("savings-draft-submit"));

    expect(screen.getByText(/Enter a name for the goal\./i)).toBeInTheDocument();
    expect(screen.getByText(/Enter a target amount\./i)).toBeInTheDocument();
    expect(screen.getByText(/Choose a target date\./i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an amount-saved value greater than the target", async () => {
    render(<SavingsGoalDraftCard {...buildProps()} />);
    fireEvent.change(screen.getByLabelText(/What are you saving for/i), {
      target: { value: "Trip" },
    });
    fireEvent.change(screen.getByLabelText(/Target amount/i), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText(/Already saved/i), {
      target: { value: "2000" },
    });
    fireEvent.change(screen.getByLabelText(/Target date/i), {
      target: { value: "2027-01-01" },
    });

    fireEvent.click(screen.getByTestId("savings-draft-submit"));

    expect(
      screen.getByText(/Already saved cannot exceed the target amount\./i),
    ).toBeInTheDocument();
  });

  it("calls onSubmit with a computed monthly contribution when the draft is valid", async () => {
    vi.useRealTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));

    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SavingsGoalDraftCard {...buildProps({ onSubmit })} />);

    fireEvent.change(screen.getByLabelText(/What are you saving for/i), {
      target: { value: "Iceland" },
    });
    fireEvent.change(screen.getByLabelText(/Target amount/i), {
      target: { value: "12000" },
    });
    fireEvent.change(screen.getByLabelText(/Target date/i), {
      target: { value: "2027-05-19" },
    });

    fireEvent.click(screen.getByTestId("savings-draft-submit"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.name).toBe("Iceland");
    expect(payload.targetAmount).toBe(12000);
    expect(payload.amountSaved).toBeNull();
    expect(payload.targetDate).toBe("2027-05-19");
    // 12000 over 12 months => 1000/month
    expect(payload.monthlyContribution).toBe(1000);
  });

  it("renders an external error message without clearing form state", () => {
    render(
      <SavingsGoalDraftCard
        {...buildProps({ errorMessage: "Could not save the goal. Try again." })}
      />,
    );

    expect(screen.getByTestId("savings-draft-error")).toHaveTextContent(
      /Could not save the goal/i,
    );
  });

  it("invokes onCancel when the cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<SavingsGoalDraftCard {...buildProps({ onCancel })} />);

    fireEvent.click(screen.getByText(/Cancel/i));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
