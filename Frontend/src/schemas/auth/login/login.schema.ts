import type { LoginFormValues } from "@myTypes/User/Auth/loginForm.types";
import type { ObjectSchema } from "yup";
import { boolean, object, string } from "yup";

export const loginSchema: ObjectSchema<LoginFormValues> = object({
  email: string().email("Ogiltig e-post").required("E-post krävs").defined(),
  password: string()
    .min(6, "Minst 6 tecken")
    .required("Lösenord krävs")
    .defined(),

  // Not required by default (progressive), but never undefined.
  HumanToken: string().nullable().defined(),

  rememberMe: boolean().defined(),
  honeypot: string().defined(),
}).required();
