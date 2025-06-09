import { wizardRootSchema } from "@schemas/wizard/wizardRootSchema"; // Add this import
import { validateStepBudgetIncome } from "@components/organisms/overlays/wizard/validation/validateBudgetInfo";


export const handleStepValidation = async (
  step: number,
  stepRefs: Record<number, any>,
  setShowSideIncome: (value: boolean) => void,
  setShowHouseholdMembers: (value: boolean) => void
): Promise<any | null> => {
  // Get the ref object itself, not its .current property
  const stepRefObject = stepRefs[step]; 

  // Check if the ref object or its current instance exists
  if (!stepRefObject?.current) return {}; 

  switch (step) {
    case 1: {
      // Pass the entire ref object to the validation function
      const isValid = await validateStepBudgetIncome(
        stepRefObject, // <-- CORRECTED
        setShowSideIncome,
        setShowHouseholdMembers
      );
      
      // If valid, get data from the instance inside the ref's current property
      return isValid ? stepRefObject.current.getStepData() : null;
    }
    
    case 2: {
      const rawData = stepRefObject.current.getStepData();
      try {
        // Use the schema to VALIDATE and CLEAN the data in one step.
        const cleanedAndValidatedData = await wizardRootSchema.validate(rawData, {
          abortEarly: false,
          stripUnknown: true,
        });
        // On success, return the clean data.
        return cleanedAndValidatedData;
      } catch (error) {
        // If validation fails, yup throws an error.
        console.error("Validation failed for Step 2:", error);
        // Ensure all fields show their errors.
        stepRefObject.current.markAllTouched();
        // Return null to signify failure.
        return null;
      }
    }

    default:
      // For any other step, assume it's valid and return its data or an empty object.
      return stepRefObject.current?.getStepData?.() ?? {};
  }
};