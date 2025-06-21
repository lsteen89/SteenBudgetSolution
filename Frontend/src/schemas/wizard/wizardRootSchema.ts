import * as yup from "yup";
import { rentSchema } from "./StepExpenditures/SubSchemas/rentSchema";
import { utilitiesSchema } from "./StepExpenditures/SubSchemas/utilitiesSchema";
import { foodSchema } from "./StepExpenditures/SubSchemas/foodSchema";
import { incomeStepSchema } from "./StepIncome/incomeStepSchema";
import { fixedExpensesSchema } from "./StepExpenditures/SubSchemas/fixedExpensesSchema";
import { transportSchema } from "./StepExpenditures/SubSchemas/transportSchema";
import { clothingSchema } from "./StepExpenditures/SubSchemas/clothingSchema";

export const wizardRootSchema = yup.object().shape({
  // Step 1: Income schema
  income: incomeStepSchema, 
  // Step 2: Expenditures schemas
  rent: rentSchema, 
  food: foodSchema,
  utilities: utilitiesSchema,
  fixedExpenses: fixedExpensesSchema,
  transport: transportSchema,
  clothing: clothingSchema,
  // Add other sub-schemas here, e.g., expenditures: expendituresSchema
});
