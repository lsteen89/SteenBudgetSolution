import { FieldValues } from "react-hook-form";

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

}
