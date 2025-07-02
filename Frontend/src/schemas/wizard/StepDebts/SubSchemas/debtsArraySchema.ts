import * as yup from "yup";
import { debtEntrySchema } from "./debtEntrySchema";

export const debtsArraySchema = yup
  .array(debtEntrySchema)
  .min(1, "Minst en skuld behövs");
