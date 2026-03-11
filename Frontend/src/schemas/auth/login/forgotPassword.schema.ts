import * as yup from "yup";

export type ForgotPasswordFormValues = {
  email: string;
};

export const forgotPasswordSchema: yup.ObjectSchema<ForgotPasswordFormValues> =
  yup.object({
    email: yup
      .string()
      .trim()
      .email("Ange en giltig e-postadress.")
      .required("E-postadress krävs."),
  });
