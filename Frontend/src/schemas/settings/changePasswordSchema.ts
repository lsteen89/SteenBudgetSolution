import type { ChangePasswordFormValues } from "@/types/User/Settings/passwordSettings.types";
import * as yup from "yup";

export const changePasswordSchema: yup.ObjectSchema<ChangePasswordFormValues> =
  yup
    .object({
      currentPassword: yup.string().required("Nuvarande lösenord krävs."),
      newPassword: yup
        .string()
        .required("Nytt lösenord krävs.")
        .min(8, "Minst 8 tecken."),
      repeatNewPassword: yup
        .string()
        .required("Upprepa nytt lösenord.")
        .oneOf([yup.ref("newPassword")], "Lösenorden matchar inte."),
    })
    .required();
