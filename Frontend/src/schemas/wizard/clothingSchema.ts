import * as yup from "yup";

export const clothingSchema = yup.object().shape({
  monthlyClothingCost: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .min(0, "Kostnad kan inte vara negativ.")
    .nullable()
    .default(0),
});
