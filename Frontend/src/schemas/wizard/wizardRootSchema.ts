import * as yup from "yup";
import { rentSchema } from "./rentSchema";
import { utilitiesSchema } from "./utilitiesSchema";
import { foodSchema } from "./foodSchema";
// import other sub-schemas as needed

export const wizardRootSchema = yup.object().shape({
  rent: rentSchema,
  food: foodSchema,
  utilities: utilitiesSchema,

  // Add other sub-schemas here, e.g., expenditures: expendituresSchema
});
