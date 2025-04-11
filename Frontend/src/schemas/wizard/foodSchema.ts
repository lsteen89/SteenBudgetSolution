import * as yup from "yup";

export const foodSchema = yup.object().shape({
    groceryBudget: yup
    .number()
    .typeError("Avgifter måste vara ett nummer.")
    .default(0)
    .nullable(),
  // free
  diningOut: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .default(0)
    .nullable(),
});


