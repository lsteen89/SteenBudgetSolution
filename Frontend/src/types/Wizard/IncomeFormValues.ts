import { FieldValues } from 'react-hook-form';
import { Frequency } from '@/types/common'; 

export interface HouseholdMember {
  id?: string;
  name: string;
  income: number | null;
  frequency: Frequency;
  yearlyIncome?: number;
}

export interface SideHustle {
  id?: string;
  name: string;
  income: number | null;
  frequency: Frequency; 
  yearlyIncome?: number;
}

export interface IncomeFormValues extends FieldValues {
  netSalary: number | null;
  showSideIncome: boolean;
  showHouseholdMembers: boolean;
  salaryFrequency: Frequency; 
  householdMembers: HouseholdMember[];
  sideHustles: SideHustle[];
  yearlySalary?: number | null;
}