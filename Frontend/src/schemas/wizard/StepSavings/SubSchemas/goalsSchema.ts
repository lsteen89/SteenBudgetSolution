import * as yup from 'yup';

export const goalItemSchema = yup.object({
  id: yup.string().optional(),
  name: yup.string().trim().required('Ange ett namn på målet.'),
  targetAmount: yup
    .number()
    .typeError('Ange ett giltigt belopp.')
    .nullable()
    .required('Ange målbelopp.')
    .min(1, 'Beloppet måste vara > 0 kr.'),
  targetDate: yup
    .string()
    .required('Ange ett måldatum.'),
  amountSaved: yup
    .number()
    .typeError('Ange ett giltigt belopp.')
    .nullable()
    .min(0, 'Beloppet måste vara >= 0 kr.'),
});

export const goalsSchema = yup.array(goalItemSchema).nullable();
export type GoalItem = yup.InferType<typeof goalItemSchema>;
