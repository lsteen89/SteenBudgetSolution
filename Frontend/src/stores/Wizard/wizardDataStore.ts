import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';

// =========================================================================
// 1. IMPORT THE BLUEPRINTS FOR EACH DEPARTMENT
// =========================================================================
import type { ExpenditureFormValues } from '@myTypes/Wizard/ExpenditureFormValues';
import type { IncomeFormValues } from '@myTypes/Wizard/IncomeFormValues';
import type { SavingsFormValues } from '@myTypes/Wizard/SavingsFormValues'; 

// =========================================================================
// 2. WizardData
// This is the blueprint for the entire operation. One object to rule them all.
// =========================================================================
export interface WizardData {
  income: Partial<IncomeFormValues>;
  expenditure: Partial<ExpenditureFormValues>;
  savings: Partial<SavingsFormValues>;
}

// =========================================================================
// 3. DEFINE THE STORE'S RESPONSIBILITIES
// =========================================================================
export interface WizardDataStore {
  data: WizardData; // It holds the main ledger.
  version: number;
  setIncome: (d: Partial<IncomeFormValues>) => void;
  setExpenditure: (d: Partial<ExpenditureFormValues>) => void;
  setSavings: (d: Partial<SavingsFormValues>) => void;
  reset: () => void;
}

// =========================================================================
// 4. DEFINE THE STARTING POINT
// This is the initial state of the store. It starts empty, like a fresh ledger.
// You can think of it as the empty book that the accountant will fill in.
// =========================================================================
const initialWizardDataState: WizardData = {
  income: {},
  expenditure: {},
  savings: {},
};

// =========================================================================
// 5. BUILD THE ACCOUNTANT'S OFFICE
// =========================================================================
export const useWizardDataStore = createWithEqualityFn<WizardDataStore>()(
  devtools(
    persist(
      (set) => ({
        data: initialWizardDataState,
        version: CODE_DATA_VERSION,
        setIncome: (incomeUpdate) =>
          set((state) => ({
            data: { ...state.data, income: { ...state.data.income, ...incomeUpdate } },
          })),
        setExpenditure: (expenditureUpdate) =>
          set((state) => ({
            data: { ...state.data, expenditure: { ...state.data.expenditure, ...expenditureUpdate } },
          })),
        setSavings: (savingsUpdate) =>
          set((state) => ({
            data: { ...state.data, savings: { ...state.data.savings, ...savingsUpdate } },
          })),
        reset: () => set({ data: { ...initialWizardDataState }, version: CODE_DATA_VERSION }),
      }),
      {
        name: 'wizard-form-data-storage',
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
);