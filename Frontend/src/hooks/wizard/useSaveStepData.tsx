import { useCallback } from 'react';
import { UseFormReturn, Path, FieldValues } from 'react-hook-form'; 
import * as yup from 'yup';
import { useToast } from '@context/ToastContext';
import { useWizardSaveQueue } from '@/stores/Wizard/wizardSaveQueue';

// --- (1) The generic constraint  FieldValues ---
interface UseSaveStepDataProps<T extends FieldValues> {
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
  onError?: () => void;

  getPartialDataForSubstep: (subStep: number, allData: T) => Partial<T>;
}


export function useSaveStepData<T extends FieldValues>({ 
  stepNumber,
  methods,
  isMobile,
  onSaveStepData,
  setCurrentStep,
  onError,
  getPartialDataForSubstep, 
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

      if (!skipValidation && !goingBackwards && isDebugMode) {

        const sliceKeys = Object.keys(
          getPartialDataForSubstep(stepLeaving, methods.getValues())
        );

        if (sliceKeys.length > 0) {
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
      }
      
      if (!goingBackwards) {
        try {
          await saveQueue.flush();
        } catch {}
      }

      const all = methods.getValues();

      const part = getPartialDataForSubstep(stepLeaving, all);

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
        // setCurrentStep(stepGoing); // Decide if you want to advance on offline save
        return false;
      }

      setCurrentStep(stepGoing);
      return true;
    },
    [methods, stepNumber, onSaveStepData, setCurrentStep, showToast, onError, saveQueue, getPartialDataForSubstep] // <-- (2) Add to dependency array
  );

  return { saveStepData };
}