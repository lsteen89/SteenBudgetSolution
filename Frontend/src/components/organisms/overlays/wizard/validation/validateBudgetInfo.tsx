import { flushSync } from "react-dom";

export const validateStepBudgetIncome = (
  stepRef: any,
  setShowSideIncome: (value: boolean) => void,
  setShowHouseholdMembers: (value: boolean) => void,
) => {
  stepRef.current?.markAllTouched();
  const isValid = stepRef.current?.validateFields();
  const allErrors = stepRef.current?.getErrors() || {};

  // Update side income flag if errors exist
  if (Object.keys(allErrors).some(key => key.startsWith("sideHustle") || key.startsWith("frequency"))) {
    flushSync(() => {
      setShowSideIncome(true);
    });
  }

  // Update household members flag if errors exist
  if (Object.keys(allErrors).some(key => key.startsWith("memberName") || key.startsWith("memberIncome") || key.startsWith("memberFrequency"))) {
    flushSync(() => {
      setShowHouseholdMembers(true);
    });
  }
  console.log("Validation result for Budget Income step:", isValid, allErrors);
  return isValid;
};
