import * as yup from "yup";

const validStrategies = ["Snowball", "Avalanche", "NoAction"] as const;
// or include "Unknown" if you want to allow it through forms (usually you don't)

export const summaryPageSchema = yup.object({
  repaymentStrategy: yup
    .mixed<(typeof validStrategies)[number]>()
    .oneOf(validStrategies, "Vänligen välj en giltig strategi.")
    .required("Du måste välja en strategi för återbetalning."),
});