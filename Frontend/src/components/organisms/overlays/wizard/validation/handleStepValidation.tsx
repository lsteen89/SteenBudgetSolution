import { validateStepBudgetInfo } from "@components/organisms/overlays/wizard/validation/validateBudgetInfo";
import { validateStepExpenditure } from "@components/organisms/overlays/wizard/validation/validateStepExpenditure";


export const handleStepValidation = async (
  step: number,
  stepRefs: Record<number, any>,
  setValues: (values: any) => void
) => {
  const stepRef = stepRefs[step];
  if (!stepRef) return true;

  let isValid = false;
  switch (step) {
    case 1:
      isValid = validateStepBudgetInfo(stepRef, setValues);
      break;
    case 2:
      isValid = validateStepExpenditure(stepRef);
      break;
    default:
      isValid = true;
  }
  return isValid;
};

