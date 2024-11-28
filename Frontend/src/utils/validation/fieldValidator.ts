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
    validateFn: (data: Partial<T>) => Record<string, string>
  ): string | undefined => {
    const fieldData: Partial<T> = { [fieldName]: fieldValue } as Partial<T>; 
    const validationErrors = validateFn(fieldData);
    return validationErrors[fieldName as string]; 
  };
  
  