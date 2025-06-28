import * as yup from 'yup';

/**
 * Defines the validation rules for the second sub-step of the Savings step.
 * This schema is conditionally applied based on the user's answer in the first sub-step.
 */
export const savingHabitsSchema = yup.object({
  monthlySavings: yup
    .number()
    .typeError('Ange ett giltigt belopp.')
    .required('Ange hur mycket du sparar varje månad.')
    .min(1, 'Beloppet måste vara större än 0 kr.'),
  
  savingMethods: yup
    .array(yup.string().required())
    .min(1, 'Välj minst ett alternativ.'),
});