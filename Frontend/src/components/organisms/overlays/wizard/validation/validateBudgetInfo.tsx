import { flushSync } from "react-dom";

export const validateStepBudgetInfo = (stepRef: any, setValues: (values: any) => void) => {
  stepRef.current?.markAllTouched();
  const isValid = stepRef.current?.validateFields();
  const allErrors = stepRef.current?.getErrors() || {};

  // Handle side income errors
  if (Object.keys(allErrors).some((key) => key.startsWith("sideHustle") || key.startsWith("frequency"))) {
    flushSync(() => setValues((prev: any) => ({ ...prev, showSideIncome: true })));
  }

  // Handle household members errors
  if (Object.keys(allErrors).some((key) => key.startsWith("memberName") || key.startsWith("memberIncome") || key.startsWith("memberFrequency"))) {
    flushSync(() => setValues((prev: any) => ({ ...prev, showHouseholdMembers: true })));
  }

  return isValid;
};
