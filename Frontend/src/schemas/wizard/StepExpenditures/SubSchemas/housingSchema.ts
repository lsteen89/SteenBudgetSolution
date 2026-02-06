import * as yup from "yup";
import { svNumberNullable } from "@/schemas/helpers/wizard/wizardHelpers";

const costOpt = (max: number, msg: string) =>
  svNumberNullable().max(max, msg);


const money = () =>
  yup
    .number()
    .transform((v, orig) => {
      if (orig === "" || orig === null || orig === undefined) return undefined;
      return Number.isNaN(v) ? undefined : v;
    })
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
      electricity: costOpt(20_000, "El kan inte vara mer än 20 000 kr."),
      heating: costOpt(20_000, "Uppvärmning kan inte vara mer än 20 000 kr."),
      water: costOpt(20_000, "Vatten kan inte vara mer än 20 000 kr."),
      waste: costOpt(20_000, "Sophämtning kan inte vara mer än 20 000 kr."),
      other: costOpt(50_000, "Övrigt kan inte vara mer än 50 000 kr."),
    })
    .default({
      electricity: undefined,
      heating: undefined,
      water: undefined,
      waste: undefined,
      other: undefined,
    }),
});