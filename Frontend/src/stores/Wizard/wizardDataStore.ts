import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ExpenditureFormValues }
  from '@myTypes/Wizard/ExpenditureFormValues';
import type { IncomeFormValues }
  from '@myTypes/Wizard/IncomeFormValues';

// 1️⃣ DeepPartial helper
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// 2️⃣ Combined shapes
export interface WizardData {
  income:      DeepPartial<IncomeFormValues>;
  expenditure: DeepPartial<ExpenditureFormValues>;
}

interface WizardDataStore {
  data:             WizardData;
  setIncome:        (d: DeepPartial<IncomeFormValues>)      => void;
  setExpenditure:   (d: DeepPartial<ExpenditureFormValues>) => void;
  reset:            ()                                      => void;
}

export const useWizardDataStore = create<WizardDataStore>()(
  devtools((set) => ({
    data: { income: {}, expenditure: {} },
    setIncome: (d) =>
      set((s) => ({
        data: {
          ...s.data,
          income: { ...s.data.income, ...d },
        },
      })),
    setExpenditure: (d) =>
      set((s) => ({
        data: {
          ...s.data,
          expenditure: { ...s.data.expenditure, ...d },
        },
      })),
    reset: () =>
      set({ data: { income: {}, expenditure: {} } }),
  })),
);
