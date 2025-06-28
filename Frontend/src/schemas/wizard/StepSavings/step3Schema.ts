import * as yup from 'yup';
import { introSchema } from './SubSchemas/introSchema';
import { savingHabitsSchema } from './SubSchemas/savingHabitsSchema';
import { goalsSchema } from './SubSchemas/goalsSchema';

export const step3Schema = yup.object({
  intro: introSchema.optional(),
  habits: savingHabitsSchema.optional(),
  goals: goalsSchema,
});

export type Step3FormValues = yup.InferType<typeof step3Schema>;
