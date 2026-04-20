import * as yup from "yup";

const today = new Date();
today.setHours(0, 0, 0, 0);

const MAX_TARGET = 100_000_000;
const MAX_SAVED = 100_000_000;
const maxYearsInFuture = 40;

const maxDate = new Date();
maxDate.setFullYear(maxDate.getFullYear() + maxYearsInFuture);

const hasAtMost2Decimals = (value: number | null | undefined) =>
  value == null || Number.isInteger(value * 100);

export const goalItemSchema = yup.object({
  id: yup.string().required(),

  name: yup.string().trim().required("Ange ett namn på målet."),

  isFavorite: yup.boolean().required().default(false),

  targetAmount: yup
    .number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value,
    )
    .typeError("Ange ett giltigt belopp.")
    .nullable()
    .required("Ange målbelopp.")
    .min(1, "Beloppet måste vara > 0 kr.")
    .max(
      MAX_TARGET,
      `Beloppet får inte vara större än ${MAX_TARGET.toLocaleString("sv-SE")} kr.`,
    )
    .test(
      "max-2-decimals",
      "Beloppet får ha högst 2 decimaler.",
      hasAtMost2Decimals,
    ),

  targetDate: yup
    .string()
    .nullable()
    .required("Ange ett måldatum.")
    .test("valid-date", "Välj ett giltigt datum.", (value) => {
      if (!value) return false;
      const d = new Date(value);
      return !Number.isNaN(d.getTime());
    })
    .test("not-in-past", "Måldatumet kan inte vara i dåtiden.", (value) => {
      if (!value) return false;
      const d = new Date(value);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    })
    .test(
      "max-date",
      `Målet kan inte vara mer än ${maxYearsInFuture} år framåt i tiden.`,
      (value) => {
        if (!value) return false;
        const d = new Date(value);
        return d <= maxDate;
      },
    ),

  amountSaved: yup
    .number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value,
    )
    .typeError("Ange ett giltigt belopp.")
    .nullable()
    .min(0, "Beloppet måste vara >= 0 kr.")
    .max(
      MAX_SAVED,
      `Beloppet får inte vara större än ${MAX_SAVED.toLocaleString("sv-SE")} kr.`,
    )
    .test(
      "max-2-decimals",
      "Beloppet får ha högst 2 decimaler.",
      hasAtMost2Decimals,
    )
    .test(
      "lte-target",
      "Redan sparat kan inte vara större än målbeloppet.",
      function (v) {
        const target = this.parent?.targetAmount;
        if (v == null || target == null) return true;
        return v <= target;
      },
    ),
});

export const goalsSchema = yup
  .array(goalItemSchema)
  .ensure()
  .test(
    "at-most-one-favorite",
    "Endast ett mål kan vara favoritmarkerat.",
    (goals) => {
      if (!goals) return true;
      return goals.filter((goal) => goal?.isFavorite).length <= 1;
    },
  );
export type GoalItem = yup.InferType<typeof goalItemSchema>;
