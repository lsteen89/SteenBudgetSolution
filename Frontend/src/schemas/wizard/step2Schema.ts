import * as yup from "yup";
import { rentSchema }        from "./rentSchema";
import { foodSchema }        from "./foodSchema";
import { utilitiesSchema }   from "./utilitiesSchema";
import { fixedExpensesSchema } from "./fixedExpensesSchema";
import { transportSchema }   from "./transportSchema";
import { clothingSchema }    from "./clothingSchema";

// Step 2 schema for the wizard, which includes rent, food, utilities, and fixed expenses
export const step2Schema = yup.object({
  rent         : rentSchema,
  food         : foodSchema,
  utilities    : utilitiesSchema,
  fixedExpenses: fixedExpensesSchema,
  transport    : transportSchema,
  clothing     : clothingSchema,
});

/* infer the correct TS interface from the schema */
export type Step2FormValues = yup.InferType<typeof step2Schema>;