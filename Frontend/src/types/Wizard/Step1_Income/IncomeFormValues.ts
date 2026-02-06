// types/Wizard/Step1_Income/IncomeFormValues.ts
import { FieldValues } from "react-hook-form";
import { Frequency } from "@/types/common";

export interface IncomeItem {
  id?: string;
  name: string;
  income: number | null;
  frequency: Frequency | null;
}

export interface IncomeFormValues extends FieldValues {
  netSalary: number | null;
  salaryFrequency: Frequency;

  householdMembers: IncomeItem[];
  sideHustles: IncomeItem[];
}
