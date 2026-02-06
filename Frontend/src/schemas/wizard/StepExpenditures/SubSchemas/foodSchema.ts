import * as yup from "yup";
import { svMoneyNullable } from "@/schemas/helpers/wizard/wizardHelpers";

export const foodSchema = yup.object({
  foodStoreExpenses: svMoneyNullable().default(0),
  takeoutExpenses: svMoneyNullable().default(0),
});


