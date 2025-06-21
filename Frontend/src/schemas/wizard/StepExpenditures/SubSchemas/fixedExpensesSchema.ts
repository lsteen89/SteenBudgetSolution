import * as yup from "yup";

/**
 * Defines the validation rules for a single, perfect custom expense item.
 * This remains unchanged as it correctly defines what a valid item is.
 */
const fixedExpenseItemSchema = yup.object({
  id: yup.string().optional(),
  name: yup
    .string()
    .trim()
    .required("Ange namn på utgiften.")
    .min(2, "Minst 2 tecken."),
  fee: yup
    .number()
    .typeError("Ange ett giltigt belopp.")
    .required("Ange kostnaden.")
    .min(1, "Beloppet måste vara > 0 kr."),
});

/**
 * Defines the validation for the entire fixed expenses form section.
 */
export const fixedExpensesSchema = yup.object({
  // These fields are standard and remain the same.
  electricity: yup.number().nullable(),
  insurance: yup.number().nullable(),
  internet: yup.number().nullable(),
  phone: yup.number().nullable(),
  unionFees: yup.number().nullable(),

  /**
   * ✅ CORRECTED LOGIC: This section now implements our agreed-upon rules.
   */
  customExpenses: yup
    .array(fixedExpenseItemSchema) // This is important for individual field errors.
    .ensure() // Converts undefined to [] to prevent errors.
    .test({
      // A more descriptive name for our test's purpose.
      name: 'all-items-are-valid-or-array-is-empty',

      // A clear error message that tells the user exactly what to do.
      message: 'Varje tillagd utgift måste ha både ett namn och ett giltigt belopp. Ta bort ofullständiga rader.',

      /**
       * The validation function that enforces our logic.
       * @param {Array} array - The customExpenses array itself.
       */
      test: (array) => {
        // Rule 1: If the user hasn't added any expenses, the array is empty and therefore VALID.
        if (!array || array.length === 0) {
          return true;
        }

        // Rule 2: If the array is NOT empty, EVERY single item in it must be valid.
        // The .every() method checks this perfectly. It returns false if even one item is invalid.
        return array.every(item => fixedExpenseItemSchema.isValidSync(item));
      },
    }),
});