import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useToast } from '@context/ToastContext';
import { ExpenditureFormValues } from '@myTypes/Wizard/ExpenditureFormValues';
import { useWizardSaveQueue } from '@/stores/Wizard/wizardSaveQueue';

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
  onError?: () => void;        // ← Callback for shake
}

/** 
 * Slices the form data so each sub-step sends only the relevant section.
 * You can add more sub-steps if needed: 
 *   2 => rent, 3 => food, 4 => utilities 
 */
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
      return { utilities: allData.utilities } as Partial<T>;
    default:
      // sub-step 1 is overview => no data to save
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
  const saveQueue     = useWizardSaveQueue();
  /* ------------------------------------------------------------------
     ⬇️  main callback
  ------------------------------------------------------------------ */
  const saveStepData = useCallback(
    async (
      stepLeaving: number,
      stepGoing: number,
      skipValidation: boolean,
      goingBackwards: boolean
    ): Promise<boolean> => {
      /* 0 ─── guard: methods not ready yet (1st render) */
      if (!methods) {
        setCurrentStep(stepGoing);
        return true;                 // optimistic navigation
      }

      /* 1 ─── validation */
      let isValid = true;
      if (!skipValidation && !goingBackwards) {
        isValid = await methods.trigger();
      }
      if (!isValid && !skipValidation && !goingBackwards) {
        /* scroll-to-error block unchanged */
        const firstErr = Object.keys(methods.formState.errors)[0];
        if (firstErr === 'rent') {
          const nested = Object.keys((methods.formState.errors as any).rent)[0];
          document
            .querySelector(`[name="rent.${nested}"]`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (firstErr === 'food') {
          ['foodStoreExpenses', 'takeoutExpenses'].forEach((n) =>
            document
              .querySelector(`[name="food.${n}"]`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          );
        }
        onError?.();
        return false;
      }

      /* 2 - Flush any previously queued chunks if moving forward (We ONLY save on forward) */
      if (!goingBackwards) {
        try {
          await saveQueue.flush();
        } catch {
          // if flush fails (still offline), we’ll enqueue again later
        }
      }

      /* 3 ─── slice */
      const all  = methods.getValues();
      const part = getPartialData<T>(stepLeaving, all);

      /* 4 ─── no-data => skip save, just navigate */
      if (Object.keys(part).length === 0) {
        setCurrentStep(stepGoing);
        return true;
      }

      /* 5 ─── call API + error handling */
      try {
        const ok = await onSaveStepData(
          stepNumber,
          stepLeaving,
          part,
          goingBackwards
        );
        if (!ok) {
          throw new Error('API save returned false');
        }
      } catch (err) {
        showToast('🚨 Kunde inte spara dina ändringar', 'error');
        onError?.();                 // trigger shake animation
        // **enqueue for retry**
        saveQueue.enqueue({  
          stepNumber,
          subStepNumber: stepLeaving,
          data: part,
          goingBackwards,
        });
        // fallthrough so we still navigate
      }
      
      /* 6 ─── navigate */
      setCurrentStep(stepGoing);
      return true;
    },
    [methods, stepNumber, onSaveStepData, setCurrentStep, showToast, onError]
  );

  return { saveStepData };
}
