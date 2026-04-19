// types/Wizard/Step1_Income/IncomeFormValues.ts
import { FieldValues } from "react-hook-form";
import { Frequency } from "@/types/common";

export const INCOME_PAYMENT_DAY_TYPES = [
  "dayOfMonth",
  "lastDayOfMonth",
] as const;

export type IncomePaymentDayType = (typeof INCOME_PAYMENT_DAY_TYPES)[number];

export interface IncomeItem {
  id?: string;
  name: string;
  income: number | null;
  frequency: Frequency | null;
}

export interface IncomeFormValues extends FieldValues {
  netSalary: number | null;
  salaryFrequency: Frequency;
  incomePaymentDayType: IncomePaymentDayType | null;
  incomePaymentDay: number | null;

  householdMembers: IncomeItem[];
  sideHustles: IncomeItem[];
}
