export type RegistrationFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  repeatEmail: string;
  password: string;
  repeatPassword: string;
  humanToken: string;
  honeypot: string;
};

export type RegistrationRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  humanToken: string;
  honeypot: string;
};

export const toRegistrationRequest = (
  v: RegistrationFormValues,
): RegistrationRequest => ({
  firstName: v.firstName.trim(),
  lastName: v.lastName.trim(),
  email: v.email.trim(),
  password: v.password,
  humanToken: v.humanToken,
  honeypot: v.honeypot ?? "",
});
