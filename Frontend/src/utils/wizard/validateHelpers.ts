export const validateSimpleStep = async <T>(
  stepRefObject: React.MutableRefObject<any>
): Promise<T | null> => {
  if (!stepRefObject?.current) return null;

  const isValid = await stepRefObject.current.validateFields?.();
  if (isValid) return stepRefObject.current.getStepData?.() ?? null;

  stepRefObject.current.markAllTouched?.();
  return null;
};