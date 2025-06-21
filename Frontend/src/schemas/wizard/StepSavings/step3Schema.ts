import * as yup from 'yup';
import { savingHabitsSchema } from './SubSchemas/savingHabitsSchema';

export const step3Schema = yup.object({
  // Field from the Intro sub-step
  savingHabit: yup
    .string()
    .required('Vänligen välj ett alternativ.'),

  // Fields from the Habits sub-step (now imported)
  ...savingHabitsSchema.fields,

  // Fields from the Goals sub-step
  goals: yup.array(
    yup.object({
      id: yup.string().optional(),
      name: yup.string().required(),
      amount: yup.number().nullable(),
    })
  ).nullable(),
});

export type Step3FormValues = yup.InferType<typeof step3Schema>;