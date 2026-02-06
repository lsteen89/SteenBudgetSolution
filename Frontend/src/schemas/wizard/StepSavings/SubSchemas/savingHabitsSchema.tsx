import * as yup from "yup";
import { SAVING_METHODS } from "@/types/Wizard/Step3_Savings/SavingsFormValues";

export const savingHabitsSchema = yup.object({
  monthlySavings: yup
    .number()
    .nullable()
    .transform((v, orig) => (orig === "" || orig === null ? null : v))
    .min(0, "Beloppet kan inte vara negativt.")
    .max(1_000_000, "Beloppet är för högt.")
    .required("Ange hur mycket du sparar varje månad."),

  savingMethods: yup
    .array()
    .of(yup.mixed<(typeof SAVING_METHODS)[number]>().oneOf([...SAVING_METHODS]))
    .when("monthlySavings", {
      is: (v: number | null) => (v ?? 0) > 0,
      then: (schema) => schema.min(1, "Välj minst ett alternativ (eller “Vill inte ange”)."),
      otherwise: (schema) => schema.max(0),
    }),
});