import * as yup from 'yup';

/**
 * Defines the validation rules for the first sub-step of the Savings step.
 * Ensures the user makes a choice about their saving habits.
 */
export const introSchema = yup.object({
  savingHabit: yup.string().required('Du måste välja ett alternativ för att fortsätta.'),
});