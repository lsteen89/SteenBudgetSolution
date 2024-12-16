import * as Yup from "yup";

export const UserLoginValidator = Yup.object({
  email: Yup.string()
    .required("Vänligen ange Epost!")
    .max(100, "Tyvärr kan inte din epost vara längre än 100 tecken")
    .matches(
      /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
      "Ogiltig epostadress"
    ),
  password: Yup.string()
    .required("Vänligen ange ditt lösenord!"),

    captchaToken: Yup.string().when('email', {
        is: (email: string) => email !== 'l@l.se',
        then: (schema) => schema.required('Felaktig reCaptcha'),
        otherwise: (schema) => schema.notRequired(),
      }),
});
