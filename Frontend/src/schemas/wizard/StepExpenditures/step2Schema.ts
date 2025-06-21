import * as yup from "yup";
import { rentSchema }        from "./SubSchemas/rentSchema";
import { foodSchema }        from "./SubSchemas/foodSchema";
import { utilitiesSchema }   from "./SubSchemas/utilitiesSchema";
import { fixedExpensesSchema } from "./SubSchemas/fixedExpensesSchema";
import { transportSchema }   from "./SubSchemas/transportSchema";
import { clothingSchema }    from "./SubSchemas/clothingSchema";
import { subscriptionsSchema } from "./SubSchemas/subscriptionsSchema";

// Step 2 schema for the wizard, which includes rent, food, utilities, and fixed expenses
export const step2Schema = yup.object({
  rent         : rentSchema,
  food         : foodSchema,
  utilities    : utilitiesSchema,
  fixedExpenses: fixedExpensesSchema,
  transport    : transportSchema,
  clothing     : clothingSchema,
  subscriptions: subscriptionsSchema,
});

/* infer the correct TS interface from the schema */
export type Step2FormValues = yup.InferType<typeof step2Schema>;