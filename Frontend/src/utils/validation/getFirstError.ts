/**
 * Retrieves the first validation error from an errors object.
 * 
 * @param errors - An object containing field-specific error messages.
 * @returns The first error message found, or null if no errors exist.
 */
export const getFirstError = (errors: Record<string, string | undefined>): string | undefined => {
  const firstKey = Object.keys(errors).find((key) => errors[key]);
  return firstKey ? errors[firstKey] : undefined;
};
  