import { moneyInputSchema } from "@/utils/forms/zodMoney";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { z } from "zod";

export const expenseEditScopeValues = [
  "currentMonthOnly",
  "currentMonthAndBudgetPlan",
  "budgetPlanOnly",
] as const;

export type ExpenseItemSchemaMessages = {
  invalidId: string;
  nameRequired: string;
  nameTooLong: string;
  categoryRequired: string;
  amountRequired: string;
  amountInvalid: string;
  amountNegative: string;
  atLeastOneItem: string;
};

export function buildCreateExpenseItemFormSchema(
  messages: ExpenseItemSchemaMessages,
) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, messages.nameRequired)
      .max(120, messages.nameTooLong),
    categoryId: z.string().uuid(messages.invalidId),
    amountMonthly: moneyInputSchema({
      requiredMessage: messages.amountRequired,
      invalidMessage: messages.amountInvalid,
      negativeMessage: messages.amountNegative,
      allowNegative: false,
      maxDecimals: 2,
    }),
    isActive: z.boolean(),
    // Optional + nullable so existing callers that omit the field keep
    // serialising the same payload. Backend rule: must be null for
    // non-subscription rows; for subscription rows it defaults to "active"
    // server-side when null. Validated via the same enum as patch.
    subscriptionLifecycleStatus: z
      .enum(["active", "paused", "cancelled"])
      .nullable()
      .optional(),
  });
}

export function buildCreateExpenseItemApiSchema(
  messages: ExpenseItemSchemaMessages,
) {
  return buildCreateExpenseItemFormSchema(messages).transform((values) => ({
    ...values,
    amountMonthly: parseMoneyInput(values.amountMonthly, {
      allowNegative: false,
      maxDecimals: 2,
    })!,
  }));
}

export function buildPatchExpenseItemFormSchema(
  messages: ExpenseItemSchemaMessages,
) {
  return buildCreateExpenseItemFormSchema(messages).extend({
    subscriptionLifecycleStatus: z
      .enum(["active", "paused", "cancelled"])
      .nullable()
      .optional(),
    updateDefault: z.boolean(),
    scope: z.enum(expenseEditScopeValues).optional(),
  });
}

export function buildPatchExpenseItemApiSchema(
  messages: ExpenseItemSchemaMessages,
) {
  return buildPatchExpenseItemFormSchema(messages).transform((values) => ({
    ...values,
    amountMonthly: parseMoneyInput(values.amountMonthly, {
      allowNegative: false,
      maxDecimals: 2,
    })!,
  }));
}

export function buildBulkPatchExpenseItemsSchema(
  messages: ExpenseItemSchemaMessages,
) {
  return z
    .array(
      z.object({
        monthExpenseItemId: z.string().uuid(messages.invalidId),
        payload: buildPatchExpenseItemApiSchema(messages),
      }),
    )
    .min(1, messages.atLeastOneItem);
}

export type CreateExpenseItemFormValues = {
  name: string;
  categoryId: string;
  amountMonthly: string;
  isActive: boolean;
  subscriptionLifecycleStatus?: "active" | "paused" | "cancelled" | null;
};
export type CreateExpenseItemApiPayload = {
  name: string;
  categoryId: string;
  amountMonthly: number;
  isActive: boolean;
  subscriptionLifecycleStatus?: "active" | "paused" | "cancelled" | null;
};

export type PatchExpenseItemFormValues = CreateExpenseItemFormValues & {
  subscriptionLifecycleStatus?: "active" | "paused" | "cancelled" | null;
  updateDefault: boolean;
  scope?: (typeof expenseEditScopeValues)[number];
};
export type PatchExpenseItemApiPayload = CreateExpenseItemApiPayload & {
  subscriptionLifecycleStatus?: "active" | "paused" | "cancelled" | null;
  updateDefault: boolean;
  scope?: (typeof expenseEditScopeValues)[number];
};

export type BulkPatchExpenseItemsApiPayload = Array<{
  monthExpenseItemId: string;
  payload: PatchExpenseItemApiPayload;
}>;
