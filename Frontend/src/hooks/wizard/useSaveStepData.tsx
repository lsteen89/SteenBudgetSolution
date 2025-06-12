import { useCallback } from 'react';
import { UseFormReturn, Path, FieldValues } from 'react-hook-form';
import * as yup from 'yup'; // Import yup
import { useToast } from '@context/ToastContext';
import { ExpenditureFormValues } from '@myTypes/Wizard/ExpenditureFormValues';
import { useWizardSaveQueue } from '@/stores/Wizard/wizardSaveQueue';


// Interface is slightly cleaned up
interface UseSaveStepDataProps<T extends ExpenditureFormValues> {
  stepNumber: number;
  methods?: UseFormReturn<T>;
  isMobile: boolean;
  onSaveStepData: (
    stepNumber: number,
    subStepNumber: number,
    data: Partial<T>,
    goingBackwards: boolean
  ) => Promise<boolean>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  onError?: () => void; // Callback for shake
}

function getPartialData<T extends ExpenditureFormValues>(
  subStep: number,
  allData: T
): Partial<T> {
  switch (subStep) {
    case 2:
      return { rent: allData.rent } as Partial<T>;
    case 3:
      return { food: allData.food } as Partial<T>;
    case 4:
      return { fixedExpenses: allData.fixedExpenses } as Partial<T>;
    case 5:
      return { transport: allData.transport } as Partial<T>;
    case 6:
      return { clothing: allData.clothing } as Partial<T>;
    default:
      return {};
  }
}

export function useSaveStepData<T extends ExpenditureFormValues>({
  stepNumber,
  methods,
  isMobile,
  onSaveStepData,
  setCurrentStep,
  onError,
}: UseSaveStepDataProps<T>) {
  const { showToast } = useToast();
  const saveQueue = useWizardSaveQueue();
  const isDebugMode = import.meta.env.MODE !== 'production';

  const saveStepData = useCallback(
    async (
      stepLeaving: number,
      stepGoing: number,
      skipValidation: boolean,
      goingBackwards: boolean
    ): Promise<boolean> => {
      if (!methods) {
        setCurrentStep(stepGoing);
        return true;
      }

      /* 1 ─── NEW BULLETPROOF VALIDATION LOGIC */
      if (!skipValidation && !goingBackwards && isDebugMode) {
          const sliceKeys = Object.keys(
          getPartialData(stepLeaving, methods.getValues())
      );                                           // ["rent"] | ["food"] | ["fixedExpenses"]

      const ok = await methods.trigger(sliceKeys as Path<T>[]); 
        if (!ok) {
          console.warn('Validation failed, showing errors');
          const allErrors = methods.formState.errors as Record<Path<T>, yup.ValidationError>;
          console.error('Validation errors:', allErrors);
          showToast("Vänligen korrigera felen.", "error");
          onError?.();                          
          return false;
        }
      }
      
      if (!goingBackwards) {
        try {
          await saveQueue.flush();
        } catch {}
      }

      const all = methods.getValues();
      const part = getPartialData<T>(stepLeaving, all);

      if (Object.keys(part).length === 0) {
        setCurrentStep(stepGoing);
        return true;
      }

      try {
        const ok = await onSaveStepData(stepNumber, stepLeaving, part, goingBackwards);
        if (!ok) { throw new Error('API save returned false'); }
      } catch (err) {
        console.error('Error saving step data:', err);
        onError?.();
        saveQueue.enqueue({ stepNumber, subStepNumber: stepLeaving, data: part, goingBackwards });
      }

      setCurrentStep(stepGoing);
      return true;
    },
    [methods, stepNumber, onSaveStepData, setCurrentStep, showToast, onError, saveQueue]
  );

  return { saveStepData };
}