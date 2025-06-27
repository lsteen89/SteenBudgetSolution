import * as yup from "yup";

export const savingHabitsSchema = yup.object({

  monthlySavings: yup
    .number()
    // A required field needs a message for when it's empty.
    .required('Du måste ange hur mycket du sparar.') 
    // The original rule, now with real power behind it.
    .min(1, 'Vänligen ange ett belopp större än 0.'), 
    
  savingMethods: yup
    .array(yup.string().required())
    .min(1, 'Vänligen välj minst ett alternativ.'),
});