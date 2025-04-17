import * as yup from "yup";

export const foodSchema = yup.object().shape({
  foodStoreExpenses: yup
    .number()
    .typeError("Avgifter måste vara ett nummer.")
    .default(0)
    .nullable(),
  // free
  takeoutExpenses: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .default(0)
    .nullable(),
});


