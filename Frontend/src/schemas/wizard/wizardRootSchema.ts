import * as yup from "yup";
import { rentSchema } from "./rentSchema";
import { utilitiesSchema } from "./utilitiesSchema";
import { foodSchema } from "./foodSchema";
import { incomeStepSchema } from "./incomeStepSchema";
// import other sub-schemas as needed

export const wizardRootSchema = yup.object().shape({
  income: incomeStepSchema, // Step 1: Income schema
  // Step 2: Expenditures schemas
  rent: rentSchema, 
  food: foodSchema,
  utilities: utilitiesSchema,

  // Add other sub-schemas here, e.g., expenditures: expendituresSchema
});
