import { moneyInputSchema } from "@/utils/forms/zodMoney";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { z } from "zod";

export const incomeEditScopeValues = [
  "currentMonthOnly",
  "currentMonthAndBudgetPlan",
  "budgetPlanOnly",
] as const;

export const incomeItemKindValues = ["sideHustle", "householdMember"] as const;

export type IncomeItemSchemaMessages = {
  nameRequired: string;
  nameTooLong: string;
  amountRequired: string;
  amountInvalid: string;
  amountNegative: string;
  kindRequired: string;
  atLeastOneItem: string;
};

export function buildIncomeItemFormSchema(messages: IncomeItemSchemaMessages) {
  return z.object({
    kind: z.enum(incomeItemKindValues),
    name: z
      .string()
      .trim()
      .min(1, messages.nameRequired)
      .max(120, messages.nameTooLong),
    amountMonthly: moneyInputSchema({
      requiredMessage: messages.amountRequired,
      invalidMessage: messages.amountInvalid,
      negativeMessage: messages.amountNegative,
      allowNegative: false,
      maxDecimals: 2,
    }),
    isActive: z.boolean(),
  });
}

export function buildIncomeItemApiSchema(messages: IncomeItemSchemaMessages) {
  return buildIncomeItemFormSchema(messages).transform((values) => ({
    ...values,
    amountMonthly: parseMoneyInput(values.amountMonthly, {
      allowNegative: false,
      maxDecimals: 2,
    })!,
  }));
}

export function buildPatchIncomeItemFormSchema(
  messages: IncomeItemSchemaMessages,
) {
  return buildIncomeItemFormSchema(messages).extend({
    scope: z.enum(incomeEditScopeValues).optional(),
    updateDefault: z.boolean(),
  });
}

export function buildPatchIncomeItemApiSchema(
  messages: IncomeItemSchemaMessages,
) {
  return buildPatchIncomeItemFormSchema(messages).transform((values) => ({
    ...values,
    amountMonthly: parseMoneyInput(values.amountMonthly, {
      allowNegative: false,
      maxDecimals: 2,
    })!,
  }));
}

export function buildBulkPatchIncomeItemsSchema(
  messages: IncomeItemSchemaMessages,
) {
  return z
    .array(
      z.object({
        monthIncomeItemId: z.string().uuid(),
        payload: buildPatchIncomeItemApiSchema(messages),
      }),
    )
    .min(1, messages.atLeastOneItem);
}

export type IncomeItemFormValues = {
  kind: (typeof incomeItemKindValues)[number];
  name: string;
  amountMonthly: string;
  isActive: boolean;
};

export type IncomeItemApiPayload = {
  kind: (typeof incomeItemKindValues)[number];
  name: string;
  amountMonthly: number;
  isActive: boolean;
};
