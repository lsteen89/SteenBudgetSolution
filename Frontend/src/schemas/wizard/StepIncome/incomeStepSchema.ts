import * as yup from "yup";
import { Frequency, VALID_FREQUENCIES } from "@/types/common";
import { svMoneyNullable, nameNullable } from "@/schemas/helpers/wizard/wizardHelpers";

const idOptional = yup
  .string()
  .nullable()
  .optional()
  .transform((v) => (v === null ? undefined : v));

export const incomeItemSchema = yup
  .object({
    id: idOptional,
    name: nameNullable,
    income: svMoneyNullable(), // ✅ call it
    frequency: yup
      .string<Frequency>()
      .oneOf(VALID_FREQUENCIES, "Ogiltig frekvens vald.")
      .nullable(),
  })
  .test("empty-or-valid", "Fyll i raden eller lämna den tom.", function (value) {
    const name = value?.name ?? null;
    const income = value?.income ?? null;
    const frequency = value?.frequency ?? null;

    const hasName = !!name;
    const hasIncome = income !== null;
    const hasMeaningfulInput = hasName || hasIncome;

    if (!hasMeaningfulInput) return true;

    if (!hasIncome) {
      return this.createError({ path: `${this.path}.income`, message: "Ange ett belopp (> 0 kr)." });
    }

    if (Number(income) <= 0) {
      return this.createError({ path: `${this.path}.income`, message: "Beloppet måste vara > 0 kr." });
    }

    if (!hasName) {
      return this.createError({ path: `${this.path}.name`, message: "Ange ett namn." });
    }

    if (String(name).length < 2) {
      return this.createError({ path: `${this.path}.name`, message: "Minst 2 tecken." });
    }

    if (!frequency) {
      return this.createError({ path: `${this.path}.frequency`, message: "Välj frekvens." });
    }

    return true;
  });

export const incomeStepSchema = yup.object({
  netSalary: svMoneyNullable() // ✅ call it
    .required("Ange din primära inkomst.")
    .min(0, "Inkomsten kan inte vara negativ.")
    .test("not-zero", "Inkomsten kan inte vara 0.", (v: number | null) => v === null || v !== 0), // ✅ typed

  salaryFrequency: yup
    .string<Frequency>()
    .oneOf(VALID_FREQUENCIES, "Ogiltig frekvens vald.")
    .required("Välj frekvens."),

  householdMembers: yup.array(incomeItemSchema).ensure(),
  sideHustles: yup.array(incomeItemSchema).ensure(),
});
