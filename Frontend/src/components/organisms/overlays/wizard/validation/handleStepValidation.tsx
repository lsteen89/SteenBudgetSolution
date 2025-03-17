import { validateStepBudgetIncome } from "@components/organisms/overlays/wizard/validation/validateBudgetInfo";
import { validateStepExpenditure } from "@components/organisms/overlays/wizard/validation/validateStepExpenditure";

export const handleStepValidation = async (
  step: number,
  stepRefs: Record<number, any>,
  setShowSideIncome: (value: boolean) => void,
  setShowHouseholdMembers: (value: boolean) => void,
) => {
  const stepRef = stepRefs[step];
  if (!stepRef) return true;

  let isValid = false;
  switch (step) {
    case 1:
      isValid = validateStepBudgetIncome(stepRef, setShowSideIncome, setShowHouseholdMembers);
      break;
    case 2:
      isValid = validateStepExpenditure(stepRef);
      break;
    default:
      isValid = true;
  }
  return isValid;
};
