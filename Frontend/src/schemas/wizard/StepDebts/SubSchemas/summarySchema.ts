import * as yup from "yup";

const validStrategies = ["avalanche", "snowball", "noAction"] as const;

export const summaryPageSchema = yup.object({
  repaymentStrategy: yup
    .mixed<(typeof validStrategies)[number]>()
    .oneOf(validStrategies, "Vänligen välj en giltig strategi.")
    .required("Du måste välja en strategi för återbetalning."),
});
