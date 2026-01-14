import * as yup from "yup";

const money = () =>
  yup
    .number()
    .transform((v, orig) => (orig === "" || orig === null ? undefined : v))
    .typeError("Måste vara ett nummer.")
    .min(0, "Belopp kan inte vara negativt.");

export const housingSchema = yup.object({
  homeType: yup
    .mixed<"rent" | "brf" | "house" | "free">()
    .oneOf(["rent", "brf", "house", "free"], "Vänligen ange boendeform.")
    .required("Vänligen ange boendeform."),

  payment: yup
    .object({
      monthlyRent: money().max(50000, "Hyra kan inte vara mer än 50 000 kr.").nullable(),
      monthlyFee: money().max(50000, "Avgift kan inte vara mer än 50 000 kr.").nullable(),
      extraFees: money().max(50000, "Extra avgifter kan inte vara mer än 50 000 kr.").nullable(),
    })
    .default(undefined)
    .when("homeType", ([homeType], schema) => {
      if (homeType === "rent") {
        return schema.shape({
          monthlyRent: money()
            .required("Vänligen ange hyra.")
            .min(1, "Vänligen ange hyra.")
            .max(50000, "Hyra kan inte vara mer än 50 000 kr."),
        });
      }

      if (homeType === "brf") {
        return schema.shape({
          monthlyFee: money()
            .required("Vänligen ange BRF-avgift.")
            .min(1, "Vänligen ange avgift.")
            .max(50000, "Avgift kan inte vara mer än 50 000 kr."),
        });
      }

      // house or free: no required payment fields
      return schema;
    }),

  runningCosts: yup
    .object({
      electricity: money().max(20000, "El kan inte vara mer än 20 000 kr.").nullable(),
      heating: money().max(20000, "Uppvärmning kan inte vara mer än 20 000 kr.").nullable(),
      water: money().max(20000, "Vatten kan inte vara mer än 20 000 kr.").nullable(),
      waste: money().max(20000, "Sophämtning kan inte vara mer än 20 000 kr.").nullable(),
      other: money().max(50000, "Övrigt kan inte vara mer än 50 000 kr.").nullable(),
    })
    .default({
      electricity: undefined,
      heating: undefined,
      water: undefined,
      waste: undefined,
      other: undefined,
    }),
});
