/**
 * Validates a single field using the provided validation function.
 * 
 * @param fieldName - The name of the field to validate.
 * @param fieldValue - The value of the field to validate.
 * @param validateFn - The full validation function for the form.
 * @returns A string containing the error message for the field, or undefined if valid.
 */
export const validateField = <T extends Record<string, any>>(
  fieldName: keyof T,
  fieldValue: any,
  validateFn: (data: Partial<T>) => Record<string, string>,
  formData: Partial<T>
): string | undefined => {
  // Merge the current formData with the new field value
  const updatedFormData: Partial<T> = { ...formData, [fieldName]: fieldValue };
  const validationErrors = validateFn(updatedFormData);
  return validationErrors[fieldName as string];
};

  