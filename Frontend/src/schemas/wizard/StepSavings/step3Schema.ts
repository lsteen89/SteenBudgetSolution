import * as yup from 'yup';
import { introSchema } from './SubSchemas/introSchema';
import { savingHabitsSchema } from './SubSchemas/savingHabitsSchema';
import { goalsSchema } from './SubSchemas/goalsSchema';

export const step3Schema = yup.object({
  // Field from the Intro sub-step
  ...introSchema.fields,

  // Fields from the Habits sub-step (now imported)
  ...savingHabitsSchema.fields,

  // Fields from the Goals sub-step
  goals: goalsSchema,
});

export type Step3FormValues = yup.InferType<typeof step3Schema>;