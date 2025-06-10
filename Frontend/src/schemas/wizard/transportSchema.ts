import * as yup from "yup";

export const transportSchema = yup.object().shape({
  // monthlyFuelCost is still relevant
  monthlyFuelCost: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .min(0, "Kostnad kan inte vara negativ.")
    .nullable()
    .default(0),

  // Added: monthlyInsuranceCost
  monthlyInsuranceCost: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .min(0, "Kostnad kan inte vara negativ.")
    .nullable()
    .default(0),

  // Added: monthlyTotalCarCost
  monthlyTotalCarCost: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .min(0, "Kostnad kan inte vara negativ.")
    .nullable()
    .default(0),
    
  // monthlyTransitCost is still relevant
  monthlyTransitCost: yup
    .number()
    .typeError("Måste vara ett nummer.")
    .min(0, "Kostnad kan inte vara negativ.")
    .nullable()
    .default(0),

  // Removed: hasCar and hasTransitCard are no longer used
});