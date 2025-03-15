export const validateStepExpenditure = (stepRef: any) => {
    stepRef.current?.markAllTouched();
    return stepRef.current?.validateFields();
  };