import * as yup from "yup";

export const clothingSchema = yup.object().shape({
  monthlyClothingCost: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .min(0, "Kostnad kan inte vara negativ.")
    .nullable()
    .default(0)
    .max(1000000, "Vi vet att många har höga kostnader, men har du verkligen en månadskostnad på 1 000 000? Hör av dig till oss om du har det så kan vi hjälpa dig!"),
});
