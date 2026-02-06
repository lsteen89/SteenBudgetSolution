import * as yup from "yup";
import { housingSchema } from "./StepExpenditures/SubSchemas/housingSchema";
import { foodSchema } from "./StepExpenditures/SubSchemas/foodSchema";
import { incomeStepSchema } from "./StepIncome/incomeStepSchema";
import { fixedExpensesSchema } from "./StepExpenditures/SubSchemas/fixedExpensesSchema";
import { transportSchema } from "./StepExpenditures/SubSchemas/transportSchema";
import { clothingSchema } from "./StepExpenditures/SubSchemas/clothingSchema";
import { subscriptionItemSchema } from "./StepExpenditures/SubSchemas/subscriptionsSchema";
import { step4Schema } from "./StepDebts/step4Schema";
import { step3Schema } from "./StepSavings/step3Schema";

export const wizardRootSchema = yup.object().shape({
  // Step 1: Income schema
  income: incomeStepSchema,
  // Step 2: Expenditures schemas
  housing: housingSchema,
  food: foodSchema,
  fixedExpenses: fixedExpensesSchema,
  transport: transportSchema,
  clothing: clothingSchema,
  subscriptions: subscriptionItemSchema,

  // Step 3: Debts schema
  // Todo

  savings: step3Schema.optional(),
  debts: step4Schema.optional(),
});
