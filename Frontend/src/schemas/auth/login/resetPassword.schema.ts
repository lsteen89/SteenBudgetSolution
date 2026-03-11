import * as yup from "yup";

export type ResetPasswordFormValues = {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
};

export const resetPasswordSchema: yup.ObjectSchema<ResetPasswordFormValues> =
  yup.object({
    email: yup
      .string()
      .trim()
      .email("Enter a valid email address.")
      .required("Email is required."),
    code: yup
      .string()
      .trim()
      .length(6, "Code must be 6 digits.")
      .required("Code is required."),
    newPassword: yup
      .string()
      .min(8, "Password must be at least 8 characters.")
      .required("New password is required."),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("newPassword")], "Passwords must match.")
      .required("Please confirm your password."),
  });
