import { useCallback } from "react";
import { FieldValues, UseFormReturn } from "react-hook-form";
import { ExpenditureFormValues } from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/interface/ExpenditureFormValues"; 

interface UseSaveStepDataProps<T extends ExpenditureFormValues> {
  stepNumber: number;   // e.g. 2 if this is the 'Expenditure' major step
  methods: UseFormReturn<T>;
  isMobile: boolean;
  onSaveStepData: (
    stepNumber: number,
    subStepNumber: number,
    data: Partial<T>
  ) => Promise<boolean>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  triggerShakeAnimation: (duration?: number) => void;
}

/** 
 * Slices the form data so each sub-step sends only the relevant section.
 * You can add more sub-steps if needed: 
 *   2 => rent, 3 => utilities, 4 => food 
 */
function getPartialData<T extends ExpenditureFormValues>(
  subStep: number, 
  allData: T
): Partial<T> {
  switch (subStep) {
    case 2:
      return { rent: allData.rent } as Partial<T>;
    case 3:
      return { utilities: allData.utilities } as Partial<T>;
    case 4:
      return { food: allData.food } as Partial<T>;
    default:
      // sub-step 1 is overview => no data to save
      return {};
  }
}

/**
 * Custom hook that saves partial form data for the sub-step we are leaving,
 * then navigates to the next sub-step.
 */
export function useSaveStepData<T extends ExpenditureFormValues>({
  stepNumber,
  methods,
  isMobile,
  onSaveStepData,
  setCurrentStep,
  triggerShakeAnimation,
}: UseSaveStepDataProps<T>) {
  
  const saveStepData = useCallback(
    async (
      stepLeaving: number,
      stepGoing: number,
      skipValidation: boolean = false
    ): Promise<boolean> => {
      // 1) Validate if needed
      let isValid = true;
      if (!skipValidation) {
        isValid = await methods.trigger();
      }

      if (!isValid) {
        if (!isMobile) {
          // Scroll to first error if desktop
          const firstErrorField = Object.keys(methods.formState.errors)[0];
          if (firstErrorField === "rent") {
            const rentErrors = (methods.formState.errors as Record<string, any>)["rent"];
            if (rentErrors) {
              // e.g. rent.monthlyRent
              const nestedKey = Object.keys(rentErrors)[0]; 
              document
                .querySelector(`[name="rent.${nestedKey}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }
          triggerShakeAnimation(1000);
        }
        return false;
      }

      // 2) Get all form data as T (which extends ExpenditureFormValues)
      const allData = methods.getValues();

      // 3) Slice out only the relevant part
      const partialData = getPartialData<T>(stepLeaving, allData);

      // If sub-step 1 => empty => skip saving
      if (Object.keys(partialData).length === 0) {
        setCurrentStep(stepGoing);
        return true;
      }

      // 4) Call parent's onSaveStepData with partial data
      const saveSuccess = await onSaveStepData(stepNumber, stepLeaving, partialData);
      if (!saveSuccess) return false;

      // 5) Navigate to stepGoing
      setCurrentStep(stepGoing);
      return true;
    },
    [methods, stepNumber, isMobile, onSaveStepData, setCurrentStep, triggerShakeAnimation]
  );

  return { saveStepData };
}
