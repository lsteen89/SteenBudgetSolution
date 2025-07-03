import * as yup from "yup";
import { rentSchema } from "./StepExpenditures/SubSchemas/rentSchema";
import { utilitiesSchema } from "./StepExpenditures/SubSchemas/utilitiesSchema";
import { foodSchema } from "./StepExpenditures/SubSchemas/foodSchema";
import { incomeStepSchema } from "./StepIncome/incomeStepSchema";
import { fixedExpensesSchema } from "./StepExpenditures/SubSchemas/fixedExpensesSchema";
import { transportSchema } from "./StepExpenditures/SubSchemas/transportSchema";
import { clothingSchema } from "./StepExpenditures/SubSchemas/clothingSchema";
import { subscriptionsSchema } from "./StepExpenditures/SubSchemas/subscriptionsSchema";
import { step4Schema } from "./StepDebts/step4Schema";
import { step3Schema } from "./StepSavings/step3Schema";

export const wizardRootSchema = yup.object().shape({
  // Step 1: Income schema
  income: incomeStepSchema, 
  // Step 2: Expenditures schemas
  rent: rentSchema, 
  food: foodSchema,
  utilities: utilitiesSchema,
  fixedExpenses: fixedExpensesSchema,
  transport: transportSchema,
  clothing: clothingSchema,
  subscriptions: subscriptionsSchema,
  
  // Step 3: Debts schema
  // Todo
  
  savings: step3Schema.optional(),     
  debts:   step4Schema.optional(),     
});
