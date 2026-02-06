import * as yup from "yup";

const money = () =>
  yup
    .number()
    .transform((v, orig) => (orig === "" || orig === null ? undefined : v))
    .typeError("Måste vara ett nummer.")
    .min(0, "Belopp kan inte vara negativt.");

export const transportSchema = yup.object({
  fuelOrCharging: money().max(20000, "Kan inte vara mer än 20 000 kr.").nullable(),
  carInsurance: money().max(20000, "Kan inte vara mer än 20 000 kr.").nullable(),
  parkingFee: money().max(20000, "Kan inte vara mer än 20 000 kr.").nullable(),
  otherCarCosts: money().max(50000, "Kan inte vara mer än 50 000 kr.").nullable(),
  publicTransit: money().max(20000, "Kan inte vara mer än 20 000 kr.").nullable(),
});