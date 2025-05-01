import { FieldValues } from 'react-hook-form';

export interface HouseholdMember {
  name: string;
  income: string;
  frequency: string;
  yearlyIncome: number;
}
export interface SideHustle {
  name: string;
  income: string;
  frequency: string;
  yearlyIncome?: number;
}

export interface IncomeFormValues extends FieldValues {
  netSalary: number | null;
  showSideIncome: boolean;
  showHouseholdMembers: boolean;
  salaryFrequency: string;
  householdMembers: HouseholdMember[];
  sideHustles: SideHustle[];
  yearlySalary?: number | null;
}
