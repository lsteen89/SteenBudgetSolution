import * as yup from "yup";

export const rentSchema = yup.object().shape({
  homeType: yup.string().required("Vänligen ange boendeform."),
  // Rent
  monthlyRent: yup
    .number()
    .typeError("Hyra måste vara ett nummer.")
    .default(0)
    .when("homeType", {
      is: "rent",
      then: (schema) =>
        schema
          .required("Vänligen ange hyra.")
          .min(1, "Vänligen ange hyra.")
          .max(50000, "Hyra kan inte vara mer än 50 000 kr."),
      otherwise: (schema) => schema.nullable(),
    }),
  rentExtraFees: yup
    .number()
    .typeError("Avgifter måste vara ett nummer.")
    .min(0, "Avgifter kan inte vara negativa.")
    .nullable()
    .default(0),

  // BRF
  monthlyFee: yup
  .number()
  .typeError("Måste vara ett nummer.")
  .default(0)
  .when("homeType", {
    is: "brf",
    then: (schema) => 
      schema
        .required("Vänligen ange BRF‐avgift.")
        .min(1, "Vänligen ange avgift.")
        .max(50000, "Max 50 000 kr."),
    otherwise: (schema) => 
      schema
        .nullable()  // No min requirement for other homeTypes
        .max(100000, "Exempel max belopp"),  // if you want some limit
  }),
  brfExtraFees: yup
    .number()
    .typeError("Avgift måste vara ett nummer.")
    .min(0, "Avgift kan inte vara negativa.")
    .nullable()
    .default(0),

  // House
  mortgagePayment: yup
  .number()
  .typeError("Måste vara ett nummer.")
  .default(0)
  .when("homeType", {
    is: "house",
    then: (schema) =>
      schema
        .required("Vänligen ange driftkostnad.")
        .min(1, "Vänligen ange driftkostnad.")
        .max(50000, "Kan inte vara mer än 50 000 kr."),
    otherwise: (schema) => schema.nullable(),
  }),

  houseotherCosts: yup
    .number()
    .typeError("Avgifter måste vara ett nummer.")
    .min(0, "Avgifter kan inte vara negativa.")
    .nullable()
    .default(0),

  // free
  otherCosts: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .min(0, "Övriga kostnader kan inte vara negativa.")
    .nullable()
    .default(0),
});


