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
    data: Partial<T>,
    goingBackwards: boolean
  ) => Promise<boolean>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
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
}: UseSaveStepDataProps<T>) {

 
  
  const saveStepData = useCallback(
    async (
      stepLeaving: number, // This is the substep we are leaving (e.g. 2, 3, 4)
      stepGoing: number, // This is the substep we are going to (e.g. 3, 4, 5)
      skipValidation: boolean, // Skip validation if true (used for forward navigation sometimes)
      goingBackwards: boolean, // If true, we are going backwards (skip API save and validation)

    ): Promise<boolean> => {
      // 1) Validate if needed
      let isValid = true;
      if (!skipValidation && !goingBackwards) {
        // If going backwards, skip validation and API save
        isValid = await methods.trigger();
      }
      const isDebugMode = process.env.NODE_ENV === 'development';

      if (!isValid && !skipValidation && !goingBackwards) { // Remove in prod

          // Scroll to first error if desktop
          const firstErrorField = Object.keys(methods.formState.errors)[0];
          console.log("firstErrorField", firstErrorField);
          if (firstErrorField === "rent") {
            const rentErrors = (methods.formState.errors as Record<string, any>)["rent"];
            if (rentErrors) {
              // e.g. rent.monthlyRent
              const nestedKey = Object.keys(rentErrors)[0]; 
              document
                .querySelector(`[name="rent.${nestedKey}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          } else if (firstErrorField === "food") {
            // Try scrolling to either of the food input fields
            document
              .querySelector(`[name="food.foodStoreExpenses"]`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
            document
              .querySelector(`[name="food.takeoutExpenses"]`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
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

      // 4) Call parent's onSaveStepData with partial data (useSaveWizardStep.tsx)

      const saveSuccess = await onSaveStepData(stepNumber, stepLeaving, partialData, goingBackwards);
      console.log("saveSuccess", saveSuccess);
      if (!saveSuccess) return false; // REMOVE IN PROD

      // 5) Navigate to stepGoing
      setCurrentStep(stepGoing);
      return true;
    },
    [methods, stepNumber, isMobile, onSaveStepData, setCurrentStep]
  );

  return { saveStepData };
}
