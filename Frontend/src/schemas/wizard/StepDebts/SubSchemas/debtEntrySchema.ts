import * as yup from "yup";

// --- The final, correct list of types ---
const debtTypes: ("installment" | "revolving" | "private" | "bank_loan")[] = [
  "installment",
  "revolving",
  "private",
  "bank_loan",
];

export const debtEntrySchema = yup.object({
  id: yup.string().required(),

  type: yup
    .mixed<typeof debtTypes[number]>()
    .oneOf(debtTypes)
    .required("Du måste välja en typ av skuld."),

  name: yup.string().trim().required("Ange ett namn på skulden."),
  
  balance: yup
    .number()
    .typeError("Ange ett giltigt belopp")
    .nullable()
    .min(0, "Beloppet kan inte vara negativt")
    .required("Du måste ange ett belopp."),
    
  apr: yup
    .number()
    .typeError("Ange en giltig ränta")
    .nullable()
    .min(0, "Räntan kan inte vara negativ")
    .required("Du måste ange en ränta (ange 0 om räntefritt)."),

  monthlyFee: yup
    .number()
    .typeError("Ange en giltig avgift")
    .nullable()
    .min(0, "Avgiften kan inte vara negativ"), // A fee cannot be negative

  /* --- Conditional fields --- */
  minPayment: yup
    .number()
    .typeError("Ange ett giltigt belopp")
    .nullable()
    .when("type", {
      is: "revolving",
      // This logic is correct, no changes needed
      then: (schema) => schema.min(1, "Måste vara minst 1 kr").required("Minsta betalning krävs för denna lånetyp."),
      otherwise: (schema) => schema.notRequired().nullable(),
    }),

  termMonths: yup
    .number()
    .typeError("Ange ett giltigt antal månader")
    .integer("Ange ett heltal")
    .nullable()
    .when("type", {
      is: (type: string) => type === "installment" || type === "bank_loan",
      then: (schema) => schema.min(1, "Löptiden måste vara minst 1 månad").required("Löptid i månader krävs för denna lånetyp."),
      otherwise: (schema) => schema.notRequired().nullable(),
    }),
});