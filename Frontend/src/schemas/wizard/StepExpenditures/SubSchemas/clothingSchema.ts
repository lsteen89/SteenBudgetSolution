import * as yup from "yup";
import { svMoneyNullable } from "@/schemas/helpers/wizard/wizardHelpers";

export const clothingSchema = yup.object({
  monthlyClothingCost: svMoneyNullable().max(50_000, "Belopp kan inte vara mer än 50 000 kr."),
});
