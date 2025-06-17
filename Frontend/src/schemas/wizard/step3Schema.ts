import * as yup from 'yup';

export const step3Schema = yup.object({
  currentSavings: yup.number().nullable(),
  goals: yup.array(
    yup.object({
      id: yup.string().optional(),
      name: yup.string().required(),
      amount: yup.number().nullable(),
    })
  ).nullable(),
});

export type Step3FormValues = yup.InferType<typeof step3Schema>;
