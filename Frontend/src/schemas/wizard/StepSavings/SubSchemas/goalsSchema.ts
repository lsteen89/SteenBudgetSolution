import * as yup from 'yup';

const today = new Date();
today.setHours(0, 0, 0, 0);
const MAX_TARGET = 100_000_000;
const MAX_SAVED = 100_000_000;
const maxYearsInFuture = 40;
const maxDate = new Date();
maxDate.setFullYear(maxDate.getFullYear() + maxYearsInFuture);

export const goalItemSchema = yup.object({
  id: yup.string().required(),
  name: yup.string().trim().required('Ange ett namn på målet.'),

  // The name is now corrected to 'amount' to match your 'SavingsGoal' type
  targetAmount: yup
    .number()
    .typeError("Ange ett giltigt belopp.")
    .nullable()
    .required("Ange målbelopp.")
    .integer("Beloppet måste vara ett heltal.")
    .min(1, "Beloppet måste vara > 0 kr.")
    .max(MAX_TARGET, `Beloppet får inte vara större än ${MAX_TARGET.toLocaleString("sv-SE")} kr.`),


  targetDate: yup
    .date()
    .transform((value, originalValue) => {
      return originalValue === "" ? null : value;
    })
    .typeError('Välj ett giltigt datum.')
    .required('Ange ett måldatum.')
    .min(today, 'Måldatumet kan inte vara i dåtiden.')
    .max(maxDate, `Målet kan inte vara mer än ${maxYearsInFuture} år framåt i tiden.`),

  amountSaved: yup
    .number()
    .typeError("Ange ett giltigt belopp.")
    .nullable()
    .integer("Beloppet måste vara ett heltal.")
    .min(0, "Beloppet måste vara >= 0 kr.")
    .max(MAX_SAVED, `Beloppet får inte vara större än ${MAX_SAVED.toLocaleString("sv-SE")} kr.`)
    .test("lte-target", "Redan sparat kan inte vara större än målbeloppet.", function (v) {
      const target = this.parent?.targetAmount;
      if (v == null || target == null) return true;
      return v <= target;
    }),
});


// This spell remains correct from our last encounter
export const goalsSchema = yup.array(goalItemSchema).ensure();

export type GoalItem = yup.InferType<typeof goalItemSchema>;