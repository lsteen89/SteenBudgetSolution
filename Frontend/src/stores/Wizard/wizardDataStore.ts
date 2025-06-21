import { create } from 'zustand';

import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { ExpenditureFormValues } from '@myTypes/Wizard/ExpenditureFormValues';
import type { IncomeFormValues } from '@myTypes/Wizard/IncomeFormValues';
import type { Step3FormValues as SavingsFormValues } from '@/schemas/wizard/StepSavings/step3Schema';
import { createWithEqualityFn } from 'zustand/traditional';


type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};


export interface WizardData {
  income: DeepPartial<IncomeFormValues>;
  expenditure: DeepPartial<ExpenditureFormValues>;
  savings: DeepPartial<SavingsFormValues>;
  // Add other steps here if they are part of this store's 'data' object
}


export interface WizardDataStore {
  data: WizardData;
  setIncome: (d: DeepPartial<IncomeFormValues>) => void;
  setExpenditure: (d: DeepPartial<ExpenditureFormValues>) => void;
  setSavings: (d: DeepPartial<SavingsFormValues>) => void;
  reset: () => void;
}


const generateUniqueId = () => `default_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

// 3️⃣ Define the initial state for your wizard data explicitly
const initialWizardDataState: WizardData = {
  income: {

  },
  expenditure: {
    // This is the key change: we're defining the default structure for fixedExpenses.
    fixedExpenses: {
      insurance: null,
      electricity: null,
      internet: null,
      phone: null,
      unionFees: null,
      customExpenses: [],
    },
    transport: {
      monthlyFuelCost: 0,
      monthlyInsuranceCost: 0,
      monthlyTotalCarCost: 0,
      monthlyTransitCost: 0,
    },
    clothing: {
      monthlyClothingCost: 0,
    },
    subscriptions: {
      netflix: null,
      spotify: null,
      hbomax: null,
      viaplay: null,
      disneyPlus: null,
      customSubscriptions: [],
    },
    // Todo: For consistency, we should also define the structure for rent, food, and utilities.
  },
  savings: {
    savingHabit: '',
    monthlySavings: null,
    savingMethods: [], 
    goals: [],
  },
};

// 4️⃣ Update the store creation to include persist middleware
export const useWizardDataStore = createWithEqualityFn<WizardDataStore>()(
  devtools( // devtools can wrap persist
    persist( // Apply the persist middleware
      (set) => ({
        data: initialWizardDataState, // Initialize with the explicit initial state
        setIncome: (incomeUpdate) =>
          set((state) => ({
            data: {
              ...state.data,
              income: { ...state.data.income, ...incomeUpdate }, // Merge update into income
            },
          })),
        setExpenditure: (expenditureUpdate) =>
          set((state) => ({
            data: {
              ...state.data,
              expenditure: expenditureUpdate,
            },
          })),
        setSavings: (savingsUpdate) =>
          set((state) => ({
            data: {
              ...state.data,
              savings: { ...state.data.savings, ...savingsUpdate },
            },
          })),
        reset: () => set({ data: { ...initialWizardDataState } }), // Reset to the defined initial state
      }),
      {
        name: 'wizard-form-data-storage', // Unique key for localStorage
        storage: createJSONStorage(() => localStorage), // Use localStorage

      }
    )
  )
  // You can add equality function if needed, e.g., shallow from 'zustand/shallow'
);