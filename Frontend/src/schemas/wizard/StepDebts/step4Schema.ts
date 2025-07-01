import * as yup from 'yup';

export const step4Schema = yup.object({
  intro: yup.object({
    hasDebts: yup
      .boolean()
      .required('Du måste svara ja eller nej för att fortsätta.')
  }),
  info: yup.object({
    notes: yup.string().optional(),
  }).optional(),
  debts: yup
    .array()
    .of(
      yup.object({
        id: yup.string().required(),
        name: yup.string().optional(),
        amount: yup.number().nullable().optional(),
      })
    )
    .optional(),
});

export type Step4FormValues = yup.InferType<typeof step4Schema>;
