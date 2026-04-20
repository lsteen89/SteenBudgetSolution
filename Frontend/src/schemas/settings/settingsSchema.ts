import type {
  BudgetSettingsFormValues,
  SettingsFormValues,
} from "@/types/User/Settings/settings.types";
import { INCOME_PAYMENT_DAY_TYPES } from "@/types/User/Settings/settings.types";
import * as yup from "yup";

export const settingsSchema: yup.ObjectSchema<SettingsFormValues> = yup
  .object({
    firstName: yup.string().trim().required("First name is required."),
    lastName: yup.string().trim().required("Last name is required."),
    locale: yup
      .mixed<SettingsFormValues["locale"]>()
      .oneOf(["sv-SE", "en-US", "et-EE"])
      .required(),
    currency: yup
      .mixed<SettingsFormValues["currency"]>()
      .oneOf(["EUR", "SEK", "USD"])
      .required(),
  })
  .required();

type BudgetSettingsSchemaT = (
  key:
    | "incomePaymentDayTypeRequired"
    | "incomePaymentDayRequired"
    | "incomePaymentDayInvalid",
) => string;

export function buildBudgetSettingsSchema(
  t: BudgetSettingsSchemaT,
): yup.ObjectSchema<BudgetSettingsFormValues> {
  return yup
    .object({
      incomePaymentDayType: yup
        .mixed<BudgetSettingsFormValues["incomePaymentDayType"]>()
        .oneOf([...INCOME_PAYMENT_DAY_TYPES], t("incomePaymentDayTypeRequired"))
        .required(t("incomePaymentDayTypeRequired")),
      incomePaymentDay: yup
        .number()
        .nullable()
        .transform((value, originalValue) =>
          originalValue === "" ||
          originalValue === null ||
          originalValue === undefined
            ? null
            : value,
        ),
      updateCurrentAndFuture: yup.boolean().required(),
    })
    .test(
      "income-payment-day-combination",
      t("incomePaymentDayInvalid"),
      function (value) {
        const paymentDayType = value?.incomePaymentDayType;
        const paymentDay = value?.incomePaymentDay ?? null;

        if (paymentDayType === "lastDayOfMonth") {
          return true;
        }

        if (paymentDay === null) {
          return this.createError({
            path: "incomePaymentDay",
            message: t("incomePaymentDayRequired"),
          });
        }

        if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 28) {
          return this.createError({
            path: "incomePaymentDay",
            message: t("incomePaymentDayInvalid"),
          });
        }

        return true;
      },
    )
    .required();
}
