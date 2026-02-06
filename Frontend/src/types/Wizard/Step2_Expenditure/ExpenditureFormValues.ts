import { FieldValues } from "react-hook-form";
import type { FixedExpensesSubForm } from "@/types/Wizard/Step2_Expenditure/FixedExpensesFormValues";
import type { SubscriptionsSubForm } from "@/types/Wizard/Step2_Expenditure/SubscriptionsFormValues";
import type { HousingForm } from "@/types/Wizard/Step2_Expenditure/HousingFormValues";
import type { TransportForm } from "@/types/Wizard/Step2_Expenditure/TransportFormValues";


export interface ExpenditureFormValues extends FieldValues {
  housing: HousingForm;
  food: { foodStoreExpenses: number | null; takeoutExpenses: number | null; };
  fixedExpenses?: FixedExpensesSubForm;
  transport: TransportForm;
  clothing: { monthlyClothingCost: number | null; };
  subscriptions?: SubscriptionsSubForm;
}
