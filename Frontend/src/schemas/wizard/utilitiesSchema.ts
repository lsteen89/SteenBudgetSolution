import * as yup from "yup";

export const utilitiesSchema = yup.object().shape({
    electricity: yup
    .number()
    .typeError("Avgifter måste vara ett nummer.")
    .min(0, "Avgifter kan inte vara negativa.")
    .nullable()
    .default(0),

  // free
  water: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .min(0, "Övriga kostnader kan inte vara negativa.")
    .nullable()
    .default(0),
});

