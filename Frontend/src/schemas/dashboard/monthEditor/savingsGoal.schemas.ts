import { moneyInputSchema } from "@/utils/forms/zodMoney";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { z } from "zod";

export const SAVINGS_GOAL_MAX_AMOUNT = 100_000_000;
export const SAVINGS_GOAL_MAX_YEARS_IN_FUTURE = 40;
export const SAVINGS_GOAL_NAME_MAX_LENGTH = 255;

export type SavingsGoalSchemaMessages = {
  nameRequired: string;
  nameTooLong: string;
  targetAmountRequired: string;
  targetAmountInvalid: string;
  targetAmountTooSmall: string;
  targetAmountTooLarge: string;
  amountSavedInvalid: string;
  amountSavedNegative: string;
  amountSavedTooLarge: string;
  amountSavedExceedsTarget: string;
  targetDateRequired: string;
  targetDateInvalid: string;
  targetDateInPast: string;
  targetDateTooFar: string;
};

const todayAtMidnight = (now: Date = new Date()): Date => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
};

const maxFutureDate = (now: Date = new Date()): Date => {
  const d = todayAtMidnight(now);
  d.setFullYear(d.getFullYear() + SAVINGS_GOAL_MAX_YEARS_IN_FUTURE);
  return d;
};

const parseIsoDate = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const amountSavedExceedsTargetIssue = (
  ctx: z.RefinementCtx,
  message: string,
) => {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["amountSaved"],
    message,
  });
};

/**
 * Builds the editor's create-goal form schema. Validation behavior mirrors the
 * wizard goal schema at Frontend/src/schemas/wizard/StepSavings/SubSchemas/goalsSchema.ts.
 * `monthlyContribution` is derived in the UI rather than entered, so it is not
 * part of the form schema.
 */
export function buildCreateSavingsGoalFormSchema(
  messages: SavingsGoalSchemaMessages,
  now: Date = new Date(),
) {
  const earliest = todayAtMidnight(now);
  const latest = maxFutureDate(now);

  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, messages.nameRequired)
        .max(SAVINGS_GOAL_NAME_MAX_LENGTH, messages.nameTooLong),
      targetAmount: moneyInputSchema({
        requiredMessage: messages.targetAmountRequired,
        invalidMessage: messages.targetAmountInvalid,
        negativeMessage: messages.amountSavedNegative,
        allowNegative: false,
        maxDecimals: 2,
      }),
      amountSaved: z.string().trim().default(""),
      targetDate: z
        .string()
        .trim()
        .min(1, messages.targetDateRequired),
    })
    .superRefine((values, ctx) => {
      const target = parseMoneyInput(values.targetAmount, {
        allowNegative: false,
        maxDecimals: 2,
      });
      if (target !== null) {
        if (target <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["targetAmount"],
            message: messages.targetAmountTooSmall,
          });
        } else if (target > SAVINGS_GOAL_MAX_AMOUNT) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["targetAmount"],
            message: messages.targetAmountTooLarge,
          });
        }
      }

      if (values.amountSaved !== "") {
        const saved = parseMoneyInput(values.amountSaved, {
          allowNegative: true,
          maxDecimals: 2,
        });
        if (saved === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["amountSaved"],
            message: messages.amountSavedInvalid,
          });
        } else if (saved < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["amountSaved"],
            message: messages.amountSavedNegative,
          });
        } else if (saved > SAVINGS_GOAL_MAX_AMOUNT) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["amountSaved"],
            message: messages.amountSavedTooLarge,
          });
        } else if (target !== null && target > 0 && saved > target) {
          amountSavedExceedsTargetIssue(ctx, messages.amountSavedExceedsTarget);
        }
      }

      if (values.targetDate !== "") {
        const parsed = parseIsoDate(values.targetDate);
        if (!parsed) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["targetDate"],
            message: messages.targetDateInvalid,
          });
        } else if (parsed < earliest) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["targetDate"],
            message: messages.targetDateInPast,
          });
        } else if (parsed > latest) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["targetDate"],
            message: messages.targetDateTooFar,
          });
        }
      }
    });
}

export type PatchSavingsGoalMonthlyMessages = {
  monthlyRequired: string;
  monthlyInvalid: string;
  monthlyNegative: string;
  monthlyTooLarge: string;
};

/**
 * Schema for the edit/patch flow. Today the editor only mutates the monthly
 * contribution; we keep this narrow but share the same hard bounds as create
 * (`>= 0`, `<= 100_000_000`, max 2 decimals) so the backend never sees a
 * payload the UI considered valid.
 */
export function buildPatchSavingsGoalMonthlyFormSchema(
  messages: PatchSavingsGoalMonthlyMessages,
) {
  return z
    .object({
      monthlyContribution: moneyInputSchema({
        requiredMessage: messages.monthlyRequired,
        invalidMessage: messages.monthlyInvalid,
        negativeMessage: messages.monthlyNegative,
        allowNegative: false,
        maxDecimals: 2,
      }),
    })
    .superRefine((values, ctx) => {
      const monthly = parseMoneyInput(values.monthlyContribution, {
        allowNegative: false,
        maxDecimals: 2,
      });
      if (monthly !== null && monthly > SAVINGS_GOAL_MAX_AMOUNT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["monthlyContribution"],
          message: messages.monthlyTooLarge,
        });
      }
    });
}

export type PatchSavingsGoalMonthlyFormValues = {
  monthlyContribution: string;
};

export function parsePatchSavingsGoalMonthly(
  values: PatchSavingsGoalMonthlyFormValues,
): number {
  const parsed = parseMoneyInput(values.monthlyContribution, {
    allowNegative: false,
    maxDecimals: 2,
  });
  if (parsed === null) {
    throw new Error(
      "monthlyContribution could not be parsed; validate form first.",
    );
  }
  return parsed;
}

export type PatchSavingsGoalAdjustMessages = PatchSavingsGoalMonthlyMessages & {
  targetDateRequired: string;
  targetDateInvalid: string;
  targetDateInPast: string;
  targetDateTooFar: string;
};

type PatchSavingsGoalAdjustSchemaOptions = {
  /**
   * Whether target date editing is active for the current scope. The modal
   * only enables date editing when the user picks
   * `currentMonthAndBudgetPlan`; for other scopes the date field is disabled
   * and must not block submission via validation.
   */
  enforceTargetDate?: boolean;
  now?: Date;
};

/**
 * Schema for the goal-adjust flow that edits both monthly contribution and
 * target date in one transaction. Reuses the monthly rules and the date rules
 * from the create schema, so any payload the UI accepts is one the backend
 * accepts.
 *
 * When `enforceTargetDate` is true (scope honors plan-level writes), the date
 * is required and validated against the same bounds as create (ISO yyyy-MM-dd,
 * not in the past, within 40 years). When false, the date is ignored — the
 * UI shows the field disabled and we still validate the monthly amount.
 */
export function buildPatchSavingsGoalAdjustFormSchema(
  messages: PatchSavingsGoalAdjustMessages,
  options: PatchSavingsGoalAdjustSchemaOptions = {},
) {
  const { enforceTargetDate = true, now = new Date() } = options;
  const earliest = todayAtMidnight(now);
  const latest = maxFutureDate(now);

  return z
    .object({
      monthlyContribution: moneyInputSchema({
        requiredMessage: messages.monthlyRequired,
        invalidMessage: messages.monthlyInvalid,
        negativeMessage: messages.monthlyNegative,
        allowNegative: false,
        maxDecimals: 2,
      }),
      targetDate: z.string().trim().default(""),
    })
    .superRefine((values, ctx) => {
      const monthly = parseMoneyInput(values.monthlyContribution, {
        allowNegative: false,
        maxDecimals: 2,
      });
      if (monthly !== null && monthly > SAVINGS_GOAL_MAX_AMOUNT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["monthlyContribution"],
          message: messages.monthlyTooLarge,
        });
      }

      if (!enforceTargetDate) return;

      if (values.targetDate === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targetDate"],
          message: messages.targetDateRequired,
        });
        return;
      }

      const parsed = parseIsoDate(values.targetDate);
      if (!parsed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targetDate"],
          message: messages.targetDateInvalid,
        });
      } else if (parsed < earliest) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targetDate"],
          message: messages.targetDateInPast,
        });
      } else if (parsed > latest) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targetDate"],
          message: messages.targetDateTooFar,
        });
      }
    });
}

export type PatchSavingsGoalAdjustFormValues = {
  monthlyContribution: string;
  targetDate: string;
};

export type PatchSavingsGoalAdjustApiPayload = {
  monthlyContribution: number;
  /**
   * Present when the user selected a scope that honors plan-level writes and
   * the date was validated. Absent when the date field was disabled — the
   * backend will leave the goal target date untouched.
   */
  targetDate?: string;
};

export function parsePatchSavingsGoalAdjust(
  values: PatchSavingsGoalAdjustFormValues,
  { enforceTargetDate = true }: { enforceTargetDate?: boolean } = {},
): PatchSavingsGoalAdjustApiPayload {
  const monthlyContribution = parsePatchSavingsGoalMonthly({
    monthlyContribution: values.monthlyContribution,
  });
  if (!enforceTargetDate) {
    return { monthlyContribution };
  }
  const targetDate = values.targetDate.trim();
  if (!parseIsoDate(targetDate)) {
    throw new Error("targetDate could not be parsed; validate form first.");
  }
  return { monthlyContribution, targetDate };
}

export type CreateSavingsGoalFormValues = {
  name: string;
  targetAmount: string;
  amountSaved: string;
  targetDate: string;
};

export type CreateSavingsGoalApiPayload = {
  name: string;
  targetAmount: number;
  amountSaved: number | null;
  targetDate: string;
};

export function parseCreateSavingsGoalFormValues(
  values: CreateSavingsGoalFormValues,
): CreateSavingsGoalApiPayload {
  const targetAmount = parseMoneyInput(values.targetAmount, {
    allowNegative: false,
    maxDecimals: 2,
  });
  if (targetAmount === null) {
    throw new Error("targetAmount could not be parsed; validate form first.");
  }

  const trimmedSaved = values.amountSaved.trim();
  const amountSaved =
    trimmedSaved === ""
      ? null
      : parseMoneyInput(trimmedSaved, {
          allowNegative: false,
          maxDecimals: 2,
        });

  if (trimmedSaved !== "" && amountSaved === null) {
    throw new Error("amountSaved could not be parsed; validate form first.");
  }

  return {
    name: values.name.trim(),
    targetAmount,
    amountSaved: amountSaved ?? null,
    targetDate: values.targetDate.trim(),
  };
}

/**
 * Suggests a monthly contribution from (target - saved) / months until target.
 * Returns 0 when months remaining is non-positive (the goal lands this month).
 * Pure helper, used for UI guidance — never enforced as a hard validation rule.
 */
export function suggestMonthlyContribution(
  targetAmount: number,
  amountSaved: number | null,
  targetDate: string,
  now: Date = new Date(),
): number | null {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null;
  const parsed = parseIsoDate(targetDate);
  if (!parsed) return null;

  const remaining = Math.max(0, targetAmount - (amountSaved ?? 0));
  if (remaining <= 0) return 0;

  const start = todayAtMidnight(now);
  const monthsRemaining =
    (parsed.getFullYear() - start.getFullYear()) * 12 +
    (parsed.getMonth() - start.getMonth());

  if (monthsRemaining <= 0) return remaining;

  return Math.ceil((remaining / monthsRemaining) * 100) / 100;
}
