import * as yup from "yup";

export const savingHabitsSchema = yup.object({
  monthlySavings: yup
    .number()
    .nullable(),
    
  savingMethods: yup
    .array(yup.string().required())
    .nullable()
    // This rule enforces that at least one checkbox must be selected.
    .min(1, 'Vänligen välj minst ett alternativ.'),
});