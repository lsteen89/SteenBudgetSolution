import * as yup from "yup";

export const transportSchema = yup.object().shape({
  hasCar: yup.boolean().default(false),
  monthlyFuelCost: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .min(0, "Kostnad kan inte vara negativ.")
    .nullable()
    .default(0),
  hasTransitCard: yup.boolean().default(false),
  monthlyTransitCost: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .min(0, "Kostnad kan inte vara negativ.")
    .nullable()
    .default(0),
});

