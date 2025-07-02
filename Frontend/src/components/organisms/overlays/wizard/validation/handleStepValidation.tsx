import { wizardRootSchema } from "@schemas/wizard/wizardRootSchema"; // Add this import
import { validateStepBudgetIncome } from "@components/organisms/overlays/wizard/validation/validateBudgetInfo";
import { validateSimpleStep } from "@/utils/wizard/validateHelpers";
/**
 * Handles validation for each step in the wizard.
 * @param step - The current step number.
 * @param stepRefs - A record of refs for each step.
 * @param setShowSideIncome - Function to set visibility of side income section.
 * @param setShowHouseholdMembers - Function to set visibility of household members section.
 * @returns The validated data for the step or null if validation fails.
 */
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
      const isValid = await validateStepBudgetIncome(
        stepRefObject,
        setShowSideIncome,
        setShowHouseholdMembers
      );
      return isValid ? stepRefObject.current.getStepData() : null;
    }
    
    /* ──────────────────────────── STEP 2 ─────────────────────────── */
    case 2:
    /* ──────────────────────────── STEP 3 ─────────────────────────── */
    case 3:
    /* ──────────────────────────── STEP 4 … n ─────────────────────── */
    default: {
      // any step that exposes validateFields/getStepData falls through here
      const data = await validateSimpleStep(stepRefObject);
      return data ?? {};
    }
  }
};