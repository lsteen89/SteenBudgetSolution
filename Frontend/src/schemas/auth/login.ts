import * as yup from 'yup';

export const loginSchema = yup.object({
  email   : yup.string().email('Ogiltig e-post').required('E-post krävs'),
  password: yup.string().min(6, 'Minst 6 tecken').required('Lösenord krävs'),
  captchaToken: yup.string().required('Bekräfta att du inte är en robot'),
});

export type LoginForm = yup.InferType<typeof loginSchema>;  