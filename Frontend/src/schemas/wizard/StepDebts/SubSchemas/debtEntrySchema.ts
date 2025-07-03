// debtEntrySchema.ts
import * as yup from "yup";

export const debtEntrySchema = yup.object({
  id: yup.string().required(),
  type: yup
    .mixed<"installment" | "revolving" | "private">() 
    .oneOf(["installment", "revolving", "private"])  
    .required("Du måste välja en typ av skuld."),
  name: yup.string().trim().required("Ange ett namn"),
  balance: yup
    .number()
    .typeError("Ange ett giltigt belopp") // Custom type error
    .nullable()
    .min(0, "Måste vara ≥ 0")
    .required("Du måste ange ett saldo."),
  apr: yup
    .number()
    .typeError("Ange en giltig ränta") // Custom type error
    .nullable()
    .min(0, "Måste vara ≥ 0")
    .required("Du måste ange en ränta."),

  /* Conditional fields */
  minPayment: yup
    .number()
    .typeError("Ange ett giltigt belopp") // Custom type error
    .nullable()
    .when("type", {
      is: "revolving",
      then: (s) => s.min(1, "Måste vara ≥ 1").required("Krävs för kreditkort"),
      otherwise: (s) => s.notRequired().nullable(),
    }),

  termMonths: yup
    .number()
    .typeError("Ange ett giltigt antal månader") // Custom type error
    .integer()
    .nullable()
    .when("type", {
      is: "installment",
      then: (s) => s.min(1).required("Krävs för avbetalningslån"),
      otherwise: (s) => s.notRequired().nullable(),
    }),
});