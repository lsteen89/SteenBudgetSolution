import * as yup from "yup";
import { housingSchema } from "./SubSchemas/housingSchema";
import { foodSchema } from "./SubSchemas/foodSchema";
import { fixedExpensesSchema } from "./SubSchemas/fixedExpensesSchema";
import { transportSchema } from "./SubSchemas/transportSchema";
import { clothingSchema } from "./SubSchemas/clothingSchema";
import { subscriptionsSchema } from "./SubSchemas/subscriptionsSchema"; // ✅ FIX

export const step2Schema = yup.object({
  housing: housingSchema,
  food: foodSchema,
  fixedExpenses: fixedExpensesSchema,
  transport: transportSchema,
  clothing: clothingSchema,
  subscriptions: subscriptionsSchema, // ✅ FIX
});

/* infer the correct TS interface from the schema */
export type Step2FormValues = yup.InferType<typeof step2Schema>;
