import type { RegistrationFormValues } from "types/User/Creation/registration.types";
import * as yup from "yup";

export const registrationSchema: yup.ObjectSchema<RegistrationFormValues> = yup
  .object({
    firstName: yup.string().trim().required("Förnamn krävs."),
    lastName: yup.string().trim().required("Efternamn krävs."),

    email: yup
      .string()
      .trim()
      .required("E-post krävs.")
      .email("Ogiltig e-postadress."),
    repeatEmail: yup
      .string()
      .trim()
      .required("Upprepa e-post.")
      .oneOf([yup.ref("email")], "E-posten matchar inte."),

    password: yup
      .string()
      .required("Lösenord krävs.")
      .min(8, "Minst 8 tecken."),
    repeatPassword: yup
      .string()
      .required("Upprepa lösenord.")
      .oneOf([yup.ref("password")], "Lösenorden matchar inte."),

    humanToken: yup.string().required("Verifiera att du inte är en bot."),

    // must always be a string; must be empty
    honeypot: yup
      .string()
      .defined()
      .default("")
      .oneOf([""], "Något gick fel. Försök igen."),
  })
  .required();
