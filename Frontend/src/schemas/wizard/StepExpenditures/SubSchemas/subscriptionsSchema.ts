import * as yup from "yup";

const subscriptionItemSchema = yup.object({
  id: yup.string().optional(),
  name: yup
    .string()
    .trim()
    .required("Ange namn på prenumerationen.")
    .min(2, "Minst 2 tecken."),
  fee: yup
    .number()
    .typeError("Ange ett giltigt belopp.")
    .required("Ange kostnaden.")
    .min(1, "Beloppet måste vara > 0 kr."),
});

export const subscriptionsSchema = yup.object({
  netflix: yup.number().nullable(),
  spotify: yup.number().nullable(),
  hbomax: yup.number().nullable(),
  viaplay: yup.number().nullable(),
  disneyPlus: yup.number().nullable(),
  customSubscriptions: yup
    .array(subscriptionItemSchema)
    .ensure()
    .test({
      name: 'all-valid-or-empty',
      message:
        'Varje tillagd prenumeration måste ha både ett namn och ett giltigt belopp. Ta bort ofullständiga rader.',
      test: (arr) => {
        if (!arr || arr.length === 0) return true;
        return arr.every((item) => subscriptionItemSchema.isValidSync(item));
      },
    }),
});
