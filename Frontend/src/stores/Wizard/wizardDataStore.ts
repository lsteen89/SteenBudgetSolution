import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { createWithEqualityFn } from 'zustand/traditional';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';
import type { ExpenditureFormValues } from '@/types/Wizard/ExpenditureFormValues';
import type { IncomeFormValues } from '@/types/Wizard/IncomeFormValues';
import type { SavingsFormValues } from '@/types/Wizard/SavingsFormValues';
import type { Step4FormValues } from '@/types/Wizard/Step4FormValues';

export interface WizardData {
  income: Partial<IncomeFormValues>;
  expenditure: Partial<ExpenditureFormValues>;
  savings: Partial<SavingsFormValues>;
  debts: Partial<Step4FormValues>;
}

export interface StepUIMetadata {
  lastVisitedSubStep?: number;
}

export interface WizardDataStore {
  data: WizardData;
  version: number;
  uiMetadata: Record<number, StepUIMetadata>; // For our bookmarks
  setIncome: (d: Partial<IncomeFormValues>) => void;
  setExpenditure: (d: Partial<ExpenditureFormValues>) => void;
  setSavings: (d: Partial<SavingsFormValues>) => void;
  setDebts: (d: Partial<Step4FormValues>) => void;
  setLastVisitedSubStep: (step: number, subStep: number) => void; // The bookmarking action
  reset: () => void;
}

const initialWizardDataState: WizardData = { income: {}, expenditure: {}, savings: {}, debts: {} };
const initialUIMetadata: Record<number, StepUIMetadata> = {};

export const useWizardDataStore = createWithEqualityFn<WizardDataStore>()(
  devtools(
    persist(
      (set) => ({
        data: initialWizardDataState,
        version: CODE_DATA_VERSION,
        uiMetadata: initialUIMetadata,
        setIncome: (incomeUpdate) => set((state) => ({ data: { ...state.data, income: { ...state.data.income, ...incomeUpdate } } })),
        setExpenditure: (expenditureUpdate) => set((state) => ({ data: { ...state.data, expenditure: { ...state.data.expenditure, ...expenditureUpdate } } })),
        setSavings: (savingsUpdate) => set((state) => ({ data: { ...state.data, savings: { ...state.data.savings, ...savingsUpdate } } })),
        setDebts: (debtsUpdate) => set((state) => ({ data: { ...state.data, debts: { ...state.data.debts, ...debtsUpdate } } })),
        

        setLastVisitedSubStep: (step, subStep) =>
          set((state) => ({
            uiMetadata: {
              ...state.uiMetadata,
              [step]: { ...state.uiMetadata[step], lastVisitedSubStep: subStep },
            },
          })),
        
        reset: () => set({ data: { ...initialWizardDataState }, uiMetadata: { ...initialUIMetadata }, version: CODE_DATA_VERSION }),
      }),
      {
        name: 'wizard-form-data-storage',
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
);