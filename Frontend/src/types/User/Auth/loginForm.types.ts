export type LoginFormValues = {
  email: string;
  password: string;
  HumanToken: string | null; // conditional (Turnstile)
  rememberMe: boolean;
  honeypot: string;
};
