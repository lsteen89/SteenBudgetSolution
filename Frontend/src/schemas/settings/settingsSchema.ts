import type { SettingsFormValues } from "@/types/User/Settings/settings.types";
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
