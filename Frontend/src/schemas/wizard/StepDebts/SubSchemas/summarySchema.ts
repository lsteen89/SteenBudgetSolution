import * as yup from "yup";

// --- Constants for this schema ---
const validStrategies: ("avalanche" | "snowball" | "noAction")[] = [
  "avalanche",
  "snowball",
  "noAction",
];

// --- The main, exported schema for the Summary Page ---
export const summaryPageSchema = yup.object({
  repaymentStrategy: yup
    .string()
    .oneOf(
      validStrategies,
      "Vänligen välj en giltig strategi."
    )
    .required("Du måste välja en strategi för återbetalning."),
});