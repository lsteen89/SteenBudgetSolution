import { FieldValues } from "react-hook-form";
import type { FixedExpensesSubForm } from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/4_SubStepFixedExpenses/SubStepFixedExpenses';

export interface ExpenditureFormValues extends FieldValues {
  rent: {
    homeType: string;
    monthlyRent: number;
    rentExtraFees: number | null;
    monthlyFee: number;
    brfExtraFees: number | null;
    mortgagePayment: number;
    houseotherCosts: number | null;
    otherCosts: number | null;
  };
  food: {
    foodStoreExpenses: number | null;
    takeoutExpenses: number | null;
  };
  utilities: {
    electricity: number | null;
    water: number | null;
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
}
