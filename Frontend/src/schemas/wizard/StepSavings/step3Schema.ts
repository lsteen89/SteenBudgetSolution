import * as yup from 'yup';
import { introSchema } from './SubSchemas/introSchema';
import { savingHabitsSchema } from './SubSchemas/savingHabitsSchema';
import { goalsSchema } from './SubSchemas/goalsSchema';

// We start with our base schema...
export const step3Schema = introSchema
  // ...then we merge the next schema into it using .concat().
  // This preserves all type information from both schemas.
  .concat(savingHabitsSchema)
  // ...and finally, we add the last piece using .shape().
  // This is a clean way to add or override specific fields.
  .shape({
    goals: goalsSchema,
  });

// Now, this InferType will work perfectly!
export type Step3FormValues = yup.InferType<typeof step3Schema>;