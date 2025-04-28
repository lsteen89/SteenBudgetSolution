import { useState, useCallback } from "react";

interface ValidationResult {
  [key: string]: string;
}

const useFormValidation = (
  initialValues: any,
  validateFn: (values: any) => ValidationResult
) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ValidationResult>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateFields = useCallback(
    (scroll = true): boolean => {
      const validationErrors = validateFn(values);
      setErrors(validationErrors);
  
      if (scroll && Object.keys(validationErrors).length) {
        const firstKey = Object.keys(validationErrors)[0];
  
        /* delay until the DOM is painted (sections expanded) */
        requestAnimationFrame(() => {
          const el = document.getElementById(firstKey);
          if (!el) return;
  
          /* ---------- OPTION A – easiest (most browsers) ------------- */
          /* Lands the field in the middle of the scrollable container   */
          el.scrollIntoView({
            behavior: "smooth",
            block: "center",      // <— vertical centring
            inline: "nearest",
          });
  
          el.focus({ preventScroll: true });   // keep focus from re-scrolling
        });
      }
      return Object.keys(validationErrors).length === 0;
    },
    [values, validateFn]
  );
  
  

  const validateField = useCallback((field: string): string | undefined => {
    const fieldError = validateFn(values)[field];
    setErrors((prevErrors) => ({ ...prevErrors, [field]: fieldError }));
    return fieldError;
  }, [values, validateFn]);

  const markAllTouched = useCallback(() => {
    const newTouched: { [key: string]: boolean } = {};
  
    // Iterate over all keys in the current form state
    Object.keys(values).forEach((key) => {
      // If the field is an array, iterate over each element
      if (Array.isArray(values[key])) {
        if (key === "householdMembers") {
          values[key].forEach((member: any, index: number) => {
            // Mark each expected household member field as touched
            if (member.name !== undefined) newTouched[`memberName-${index}`] = true;
            if (member.income !== undefined) newTouched[`memberIncome-${index}`] = true;
            if (member.frequency !== undefined) newTouched[`memberFrequency-${index}`] = true;
          });
        } else if (key === "sideHustles") {
          values[key].forEach((side: any, index: number) => {
            // Mark each expected side hustle field as touched
            if (side.name !== undefined) newTouched[`sideHustleName-${index}`] = true;
            if (side.income !== undefined) newTouched[`sideHustleIncome-${index}`] = true;
            if (side.frequency !== undefined) newTouched[`frequency-${index}`] = true;
          });
        }
      } else {
        // For non-array fields, mark them directly
        newTouched[key] = true;
      }
    });
  
    setTouched(newTouched);
  }, [values]);

  // mark a single field as touched
  const markFieldTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const removeFieldState = useCallback((field: string) => {
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[field];
      return newErrors;
    });
    setTouched((prevTouched) => {
      const newTouched = { ...prevTouched };
      delete newTouched[field];
      return newTouched;
    });
  }, []);


  return {
    values,
    setValues,
    errors,
    touched,
    validateFields,
    validateField, 
    markAllTouched,
    markFieldTouched, 
    removeFieldState,
  };
};

export default useFormValidation;
