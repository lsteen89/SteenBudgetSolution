import * as yup from "yup";
import { rentSchema } from "./rentSchema";
import { utilitiesSchema } from "./utilitiesSchema";
import { foodSchema } from "./foodSchema";
import { incomeStepSchema } from "./incomeStepSchema";
import { fixedExpensesSchema } from './fixedExpensesSchema';
import { transportSchema } from './transportSchema';
import { clothingSchema } from './clothingSchema';

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
