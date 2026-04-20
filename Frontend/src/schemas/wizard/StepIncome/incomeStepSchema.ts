import {
  nameNullable,
  svMoneyNullable,
} from "@/schemas/helpers/wizard/wizardHelpers";
import {
  INCOME_PAYMENT_DAY_TYPES,
  type IncomePaymentDayType,
} from "@/types/Wizard/Step1_Income/IncomeFormValues";
import { Frequency, VALID_FREQUENCIES } from "@/types/common";
import * as yup from "yup";

const idOptional = yup
  .string()
  .nullable()
  .optional()
  .transform((v) => (v === null ? undefined : v));

export const incomeItemSchema = yup
  .object({
    id: idOptional,
    name: nameNullable,
    income: svMoneyNullable(),
    frequency: yup
      .string<Frequency>()
      .oneOf(VALID_FREQUENCIES, "Ogiltig frekvens vald.")
      .nullable(),
  })
  .test(
    "empty-or-valid",
    "Fyll i raden eller lämna den tom.",
    function (value) {
      const name = value?.name ?? null;
      const income = value?.income ?? null;
      const frequency = value?.frequency ?? null;

      const hasName = !!name;
      const hasIncome = income !== null;
      const hasMeaningfulInput = hasName || hasIncome;

      if (!hasMeaningfulInput) return true;

      if (!hasIncome) {
        return this.createError({
          path: `${this.path}.income`,
          message: "Ange ett belopp (> 0 kr).",
        });
      }

      if (Number(income) <= 0) {
        return this.createError({
          path: `${this.path}.income`,
          message: "Beloppet måste vara > 0 kr.",
        });
      }

      if (!hasName) {
        return this.createError({
          path: `${this.path}.name`,
          message: "Ange ett namn.",
        });
      }

      if (String(name).length < 2) {
        return this.createError({
          path: `${this.path}.name`,
          message: "Minst 2 tecken.",
        });
      }

      if (!frequency) {
        return this.createError({
          path: `${this.path}.frequency`,
          message: "Välj frekvens.",
        });
      }

      return true;
    },
  );

export const incomeStepSchema = yup.object({
  netSalary: svMoneyNullable() // ✅ call it
    .required("Ange din primära inkomst.")
    .min(0, "Inkomsten kan inte vara negativ.")
    .test(
      "not-zero",
      "Inkomsten kan inte vara 0.",
      (v: number | null) => v === null || v !== 0,
    ),

  salaryFrequency: yup
    .string<Frequency>()
    .oneOf(VALID_FREQUENCIES, "Ogiltig frekvens vald.")
    .required("Välj frekvens."),

  incomePaymentDayType: yup
    .mixed<IncomePaymentDayType | null>()
    .oneOf([...INCOME_PAYMENT_DAY_TYPES, null]),

  incomePaymentDay: yup
    .number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue === null || originalValue === undefined
        ? null
        : value,
    )
    .nullable(),

  householdMembers: yup.array(incomeItemSchema).ensure(),
  sideHustles: yup.array(incomeItemSchema).ensure(),
})
  .test(
    "income-payment-day-combination",
    "Ogiltigt löneutbetalningsdatum.",
    function (value) {
      const paymentDayType = value?.incomePaymentDayType ?? null;
      const paymentDay = value?.incomePaymentDay ?? null;

      if (paymentDayType === null && paymentDay === null) {
        return true;
      }

      if (paymentDayType === "dayOfMonth") {
        if (paymentDay === null) {
          return this.createError({
            path: "incomePaymentDay",
            message: "Välj en dag i månaden.",
          });
        }

        if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 28) {
          return this.createError({
            path: "incomePaymentDay",
            message: "Välj en dag mellan 1 och 28.",
          });
        }

        return true;
      }

      if (paymentDayType === "lastDayOfMonth") {
        if (paymentDay !== null) {
          return this.createError({
            path: "incomePaymentDay",
            message: "Dag i månaden ska vara tomt när sista dagen är vald.",
          });
        }

        return true;
      }

      return this.createError({
        path: "incomePaymentDayType",
        message: "Välj när du vanligtvis får lön.",
      });
    },
  );
