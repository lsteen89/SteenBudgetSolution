import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import SavingsHabitsCard from "./SavingsHabitsCard";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { SAVING_METHODS } from "@/types/Wizard/Step3_Savings/SavingsFormValues";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "USD",
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

type SavingMethod = (typeof SAVING_METHODS)[number];

const options = [
  { value: "auto", label: "Automatic transfers" },
  { value: "manual", label: "Manual transfers" },
  { value: "invest", label: "Investments" },
  { value: "preferNot", label: "Prefer not to say" },
] satisfies Array<{ value: SavingMethod; label: string }>;

function renderCard(defaultValues: Step3FormValues) {
  function TestHarness() {
    const methods = useForm<Step3FormValues>({ defaultValues });

    return (
      <FormProvider {...methods}>
        <SavingsHabitsCard<SavingMethod>
          idBasePath="habits"
          sliderSoftMax={1000}
          inputHardMax={1_000_000}
          options={options}
          monthlyIncome={3000}
        />
      </FormProvider>
    );
  }

  return render(<TestHarness />);
}

describe("SavingsHabitsCard", () => {
  it("shows preferNot as selected in the summary and checkbox state", async () => {
    renderCard({
      intro: { savingHabit: "" },
      habits: { monthlySavings: 250, savingMethods: ["preferNot"] },
      goals: [],
    });

    await waitFor(() => {
      expect(screen.getAllByText("Prefer not to say").length).toBeGreaterThan(1);
    });

    expect(screen.getByLabelText("Prefer not to say")).toBeChecked();
  });

  it("keeps preferNot exclusive when toggling between options", async () => {
    renderCard({
      intro: { savingHabit: "" },
      habits: { monthlySavings: 250, savingMethods: ["auto"] },
      goals: [],
    });

    const auto = await screen.findByLabelText("Automatic transfers");
    const preferNot = screen.getByLabelText("Prefer not to say");

    fireEvent.click(preferNot);

    await waitFor(() => {
      expect(preferNot).toBeChecked();
      expect(auto).not.toBeChecked();
    });

    fireEvent.click(auto);

    await waitFor(() => {
      expect(auto).toBeChecked();
      expect(preferNot).not.toBeChecked();
    });
  });
});
