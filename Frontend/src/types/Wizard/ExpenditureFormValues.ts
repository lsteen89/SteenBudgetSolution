import { FieldValues } from "react-hook-form";
import type { FixedExpensesSubForm } from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/4_SubStepFixedExpenses/SubStepFixedExpenses';
import type { SubscriptionsSubForm } from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/7_SubStepSubscriptions/SubStepSubscriptions';

// 1. Move types outside the interface
export type HousingType = "rent" | "brf" | "house" | "free";

export interface HousingRunningCostsForm {
  electricity: number | null;
  heating: number | null;
  water: number | null;
  waste: number | null;
  otherHomeRunningCosts: number | null;
}

export interface HousingForm {
  homeType: HousingType | "";
  monthlyRent: number | null;
  monthlyApartmentFee: number | null;
  otherHousingFees: number | null;
  runningCosts: HousingRunningCostsForm;
}

// 2. Single declaration extending FieldValues
export interface ExpenditureFormValues extends FieldValues {
  housing: HousingForm;
  food: {
    foodStoreExpenses: number | null;
    takeoutExpenses: number | null;
  };
  fixedExpenses?: FixedExpensesSubForm;
  transport: {
    monthlyFuelCost: number | null;
    monthlyInsuranceCost: number | null;
    monthlyTotalCarCost: number | null;
    monthlyTransitCost: number | null;
  };
  clothing: {
    monthlyClothingCost: number | null;
  };
  subscriptions?: SubscriptionsSubForm;
}