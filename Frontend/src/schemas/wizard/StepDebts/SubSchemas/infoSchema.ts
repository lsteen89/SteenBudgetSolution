import * as yup from "yup";

export const debtsInfoSchema = yup.object({
  notes: yup.string().max(2_000, "Max 2000 tecken"),
});