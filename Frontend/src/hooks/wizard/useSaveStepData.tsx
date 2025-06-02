import { useCallback } from 'react';
import { UseFormReturn, Path, FieldValues  } from 'react-hook-form';
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
      // Determine the top-level field keys relevant to the step we are leaving.
      // We use methods.getValues() to provide the full form data structure that getPartialData might expect.
        const relevantDataSlice = getPartialData<T>(stepLeaving, methods.getValues());
        // And this is the key change for fieldsToValidate:
        const fieldsToValidate = Object.keys(relevantDataSlice) as Path<T>[];
        // Alternatively, you can write it as: const fieldsToValidate = Object.keys(relevantDataSlice) as (keyof T)[];

        if (fieldsToValidate.length > 0) {
          console.log(`Validating fields for step ${stepLeaving}:`, fieldsToValidate.map(f => String(f))); // Ensure logging as string if needed
          // Now, fieldsToValidate is (keyof T)[], which is assignable to Path<T>[]
          isValid = await methods.trigger(fieldsToValidate); // This should resolve the TypeScript error
        } else {
          // No specific fields to validate for this step...
          console.log(`No specific fields to validate for step ${stepLeaving}. Proceeding.`);
          isValid = true;
        }

        if (!isValid) {
          // Validation for the current step's specific fields has failed.
          // The methods.formState.errors object will now contain errors for these fields.
          // The existing scroll-to-error logic might need adjustment if it's too generic
          // or doesn't correctly pick up errors from the specifically validated fields.

          // Attempt to scroll to the first error within the fields that were just validated.
          let scrolledToError = false;
          for (const fieldKey of fieldsToValidate) { // e.g., "rent", "food"
            const errorForFieldKey = (methods.formState.errors as any)[fieldKey];
            if (errorForFieldKey) {
              // Scroll logic based on fieldKey:
              if (fieldKey === 'rent') {
                const nestedRentErrorKey = Object.keys(errorForFieldKey)[0];
                if (nestedRentErrorKey) {
                  document
                    .querySelector(`[name="rent.${nestedRentErrorKey}"]`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  scrolledToError = true;
                  break;
                }
              } else if (fieldKey === 'food') {
                // Simplified example for food; you might need more specific handling
                // if errors can be deeply nested within 'food'.
                const foodErrorKeys = Object.keys(errorForFieldKey);
                if (foodErrorKeys.length > 0) {
                  // Try to find a common scroll target or first error field within food
                  const firstNestedFoodErrorKey = foodErrorKeys[0]; // e.g. 'foodStoreExpenses'
                  // This selector might need to be more dynamic based on your food structure
                  document
                    .querySelector(`[name="food.${firstNestedFoodErrorKey}"]`) 
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  scrolledToError = true;
                  break;
                }
              }
              // Add more cases if you have other top-level keys from getPartialData
            }
          }
          
          onError?.(); // Trigger shake animation
          console.log(`Validation failed for fields [${fieldsToValidate.join(', ')}] in step ${stepLeaving}. Errors:`, methods.formState.errors);
          // Consider making the toast message more specific if possible,
          // or rely on field-level errors and the scroll-to-error behavior.
          showToast('🚨 Något i formuläret är fel ifyllt för detta steg.', 'error');
          return false;
        }
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
        // TODO: This should be shown later, not here
        console.error('Error saving step data:', err);
        //showToast('🚨 Kunde inte spara dina ändringar', 'error');
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
