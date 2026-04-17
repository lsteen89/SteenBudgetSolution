import { normalizeMoneyInput, parseMoneyInput } from "@/utils/money/moneyInput";
import { z } from "zod";

type MoneySchemaOptions = {
  requiredMessage?: string;
  invalidMessage?: string;
  negativeMessage?: string;
  allowNegative?: boolean;
  maxDecimals?: number;
};

export function moneyInputSchema(options?: MoneySchemaOptions) {
  const requiredMessage = options?.requiredMessage ?? "Amount is required";
  const invalidMessage =
    options?.invalidMessage ?? "Enter a valid amount with up to 2 decimals";
  const negativeMessage =
    options?.negativeMessage ?? "Amount cannot be negative";
  const allowNegative = options?.allowNegative ?? false;
  const maxDecimals = options?.maxDecimals ?? 2;

  return z
    .string()
    .trim()
    .min(1, requiredMessage)
    .superRefine((value, ctx) => {
      const normalized = normalizeMoneyInput(value);

      if (normalized === "") {
        return;
      }

      if (!allowNegative && normalized.startsWith("-")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: negativeMessage,
        });
        return;
      }

      if (
        parseMoneyInput(value, {
          allowNegative,
          maxDecimals,
        }) === null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: invalidMessage,
        });
      }
    });
}
