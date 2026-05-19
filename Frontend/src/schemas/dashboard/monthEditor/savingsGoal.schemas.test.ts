import { describe, expect, it } from "vitest";
import {
  SAVINGS_GOAL_MAX_AMOUNT,
  SAVINGS_GOAL_NAME_MAX_LENGTH,
  buildCreateSavingsGoalFormSchema,
  buildPatchSavingsGoalAdjustFormSchema,
  buildPatchSavingsGoalMonthlyFormSchema,
  parseCreateSavingsGoalFormValues,
  parsePatchSavingsGoalAdjust,
  parsePatchSavingsGoalMonthly,
  suggestMonthlyContribution,
  type PatchSavingsGoalAdjustMessages,
  type PatchSavingsGoalMonthlyMessages,
  type SavingsGoalSchemaMessages,
} from "./savingsGoal.schemas";

const messages: SavingsGoalSchemaMessages = {
  nameRequired: "name-required",
  nameTooLong: "name-too-long",
  targetAmountRequired: "target-amount-required",
  targetAmountInvalid: "target-amount-invalid",
  targetAmountTooSmall: "target-amount-too-small",
  targetAmountTooLarge: "target-amount-too-large",
  amountSavedInvalid: "amount-saved-invalid",
  amountSavedNegative: "amount-saved-negative",
  amountSavedTooLarge: "amount-saved-too-large",
  amountSavedExceedsTarget: "amount-saved-exceeds-target",
  targetDateRequired: "target-date-required",
  targetDateInvalid: "target-date-invalid",
  targetDateInPast: "target-date-in-past",
  targetDateTooFar: "target-date-too-far",
};

const fixedNow = new Date(2026, 4, 19);

const valid = (override: Partial<{
  name: string;
  targetAmount: string;
  amountSaved: string;
  targetDate: string;
}> = {}) => ({
  name: "Iceland trip",
  targetAmount: "35000",
  amountSaved: "",
  targetDate: "2027-06-30",
  ...override,
});

describe("createSavingsGoal form schema", () => {
  const schema = buildCreateSavingsGoalFormSchema(messages, fixedNow);

  it("accepts a fully valid draft", () => {
    expect(schema.safeParse(valid()).success).toBe(true);
  });

  it("trims and rejects an empty name", () => {
    const result = schema.safeParse(valid({ name: "   " }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "name")).toBe(true);
    }
  });

  it("rejects names longer than 255 chars", () => {
    const result = schema.safeParse(
      valid({ name: "x".repeat(SAVINGS_GOAL_NAME_MAX_LENGTH + 1) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "name")?.message,
      ).toBe(messages.nameTooLong);
    }
  });

  it("rejects target amounts that are zero or negative", () => {
    expect(schema.safeParse(valid({ targetAmount: "0" })).success).toBe(false);
    expect(schema.safeParse(valid({ targetAmount: "-5" })).success).toBe(false);
  });

  it("rejects target amounts that exceed the cap", () => {
    const result = schema.safeParse(
      valid({ targetAmount: String(SAVINGS_GOAL_MAX_AMOUNT + 1) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "targetAmount")?.message,
      ).toBe(messages.targetAmountTooLarge);
    }
  });

  it("rejects target amounts with more than two decimals", () => {
    const result = schema.safeParse(valid({ targetAmount: "10.123" }));
    expect(result.success).toBe(false);
  });

  it("allows amount saved to be empty", () => {
    expect(schema.safeParse(valid({ amountSaved: "" })).success).toBe(true);
  });

  it("rejects amount saved greater than target", () => {
    const result = schema.safeParse(
      valid({ targetAmount: "1000", amountSaved: "1500" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "amountSaved")?.message,
      ).toBe(messages.amountSavedExceedsTarget);
    }
  });

  it("rejects amount saved with a negative number", () => {
    const result = schema.safeParse(valid({ amountSaved: "-1" }));
    expect(result.success).toBe(false);
  });

  it("requires a target date", () => {
    const result = schema.safeParse(valid({ targetDate: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "targetDate")?.message,
      ).toBe(messages.targetDateRequired);
    }
  });

  it("rejects target dates in the past", () => {
    const result = schema.safeParse(valid({ targetDate: "2026-05-18" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "targetDate")?.message,
      ).toBe(messages.targetDateInPast);
    }
  });

  it("accepts today as a valid target date", () => {
    const today = `${fixedNow.getFullYear()}-${String(fixedNow.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(fixedNow.getDate()).padStart(2, "0")}`;
    expect(schema.safeParse(valid({ targetDate: today })).success).toBe(true);
  });

  it("rejects target dates more than 40 years in the future", () => {
    const result = schema.safeParse(valid({ targetDate: "2070-01-01" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "targetDate")?.message,
      ).toBe(messages.targetDateTooFar);
    }
  });
});

describe("parseCreateSavingsGoalFormValues", () => {
  it("returns trimmed name and parsed numbers", () => {
    const parsed = parseCreateSavingsGoalFormValues({
      name: "  Trip  ",
      targetAmount: "1 000,50",
      amountSaved: "200",
      targetDate: "2027-01-01",
    });
    expect(parsed).toEqual({
      name: "Trip",
      targetAmount: 1000.5,
      amountSaved: 200,
      targetDate: "2027-01-01",
    });
  });

  it("returns null amountSaved when blank", () => {
    const parsed = parseCreateSavingsGoalFormValues({
      name: "Trip",
      targetAmount: "1000",
      amountSaved: "   ",
      targetDate: "2027-01-01",
    });
    expect(parsed.amountSaved).toBeNull();
  });
});

const patchMessages: PatchSavingsGoalMonthlyMessages = {
  monthlyRequired: "monthly-required",
  monthlyInvalid: "monthly-invalid",
  monthlyNegative: "monthly-negative",
  monthlyTooLarge: "monthly-too-large",
};

describe("patchSavingsGoalMonthly schema", () => {
  const schema = buildPatchSavingsGoalMonthlyFormSchema(patchMessages);

  it("accepts a whole-krona contribution", () => {
    expect(schema.safeParse({ monthlyContribution: "1500" }).success).toBe(
      true,
    );
  });

  it("accepts a decimal contribution with up to two decimals", () => {
    expect(
      schema.safeParse({ monthlyContribution: "1234.56" }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ monthlyContribution: "1234,5" }).success,
    ).toBe(true);
  });

  it("rejects more than two decimals", () => {
    const result = schema.safeParse({ monthlyContribution: "1234.567" });
    expect(result.success).toBe(false);
  });

  it("rejects negative contributions", () => {
    const result = schema.safeParse({ monthlyContribution: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects contributions above the cap", () => {
    const result = schema.safeParse({
      monthlyContribution: String(SAVINGS_GOAL_MAX_AMOUNT + 1),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "monthlyContribution")
          ?.message,
      ).toBe(patchMessages.monthlyTooLarge);
    }
  });

  it("requires a value", () => {
    const result = schema.safeParse({ monthlyContribution: "  " });
    expect(result.success).toBe(false);
  });
});

describe("parsePatchSavingsGoalMonthly", () => {
  it("preserves decimal precision without rounding", () => {
    expect(
      parsePatchSavingsGoalMonthly({ monthlyContribution: "1 234,56" }),
    ).toBe(1234.56);
    expect(
      parsePatchSavingsGoalMonthly({ monthlyContribution: "0.05" }),
    ).toBe(0.05);
  });
});

const adjustMessages: PatchSavingsGoalAdjustMessages = {
  monthlyRequired: "monthly-required",
  monthlyInvalid: "monthly-invalid",
  monthlyNegative: "monthly-negative",
  monthlyTooLarge: "monthly-too-large",
  targetDateRequired: "target-date-required",
  targetDateInvalid: "target-date-invalid",
  targetDateInPast: "target-date-in-past",
  targetDateTooFar: "target-date-too-far",
};

describe("patchSavingsGoalAdjust schema (monthly + target date)", () => {
  const schema = buildPatchSavingsGoalAdjustFormSchema(adjustMessages, {
    now: fixedNow,
  });

  it("accepts a valid combination", () => {
    expect(
      schema.safeParse({
        monthlyContribution: "1500",
        targetDate: "2027-06-30",
      }).success,
    ).toBe(true);
  });

  it("requires a target date", () => {
    const result = schema.safeParse({
      monthlyContribution: "1500",
      targetDate: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "targetDate")?.message,
      ).toBe(adjustMessages.targetDateRequired);
    }
  });

  it("rejects a target date in the past", () => {
    const result = schema.safeParse({
      monthlyContribution: "1500",
      targetDate: "2026-05-18", // before pinned today
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "targetDate")?.message,
      ).toBe(adjustMessages.targetDateInPast);
    }
  });

  it("rejects a target date more than 40 years ahead", () => {
    const result = schema.safeParse({
      monthlyContribution: "1500",
      targetDate: "2080-01-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "targetDate")?.message,
      ).toBe(adjustMessages.targetDateTooFar);
    }
  });

  it("rejects more than two decimals on the monthly amount", () => {
    const result = schema.safeParse({
      monthlyContribution: "1234.567",
      targetDate: "2027-06-30",
    });
    expect(result.success).toBe(false);
  });

  it("rejects monthly amount above the cap", () => {
    const result = schema.safeParse({
      monthlyContribution: String(SAVINGS_GOAL_MAX_AMOUNT + 1),
      targetDate: "2027-06-30",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "monthlyContribution")
          ?.message,
      ).toBe(adjustMessages.monthlyTooLarge);
    }
  });
});

describe("parsePatchSavingsGoalAdjust", () => {
  it("returns the parsed decimal contribution and the ISO date by default", () => {
    expect(
      parsePatchSavingsGoalAdjust({
        monthlyContribution: "1 234,56",
        targetDate: "2027-06-30",
      }),
    ).toEqual({ monthlyContribution: 1234.56, targetDate: "2027-06-30" });
  });

  it("omits targetDate when enforceTargetDate=false", () => {
    expect(
      parsePatchSavingsGoalAdjust(
        { monthlyContribution: "1500", targetDate: "" },
        { enforceTargetDate: false },
      ),
    ).toEqual({ monthlyContribution: 1500 });
  });
});

describe("patchSavingsGoalAdjust schema with enforceTargetDate=false", () => {
  const schema = buildPatchSavingsGoalAdjustFormSchema(adjustMessages, {
    now: fixedNow,
    enforceTargetDate: false,
  });

  it("accepts an empty target date", () => {
    expect(
      schema.safeParse({ monthlyContribution: "1500", targetDate: "" }).success,
    ).toBe(true);
  });

  it("still validates the monthly cap", () => {
    expect(
      schema.safeParse({
        monthlyContribution: String(SAVINGS_GOAL_MAX_AMOUNT + 1),
        targetDate: "",
      }).success,
    ).toBe(false);
  });

  it("does not reject a past date when the field is not enforced", () => {
    expect(
      schema.safeParse({
        monthlyContribution: "1500",
        targetDate: "2026-05-18",
      }).success,
    ).toBe(true);
  });
});

describe("suggestMonthlyContribution", () => {
  it("rounds the per-month figure up to two decimals", () => {
    // 10000 / 10 = 1000 per month
    const result = suggestMonthlyContribution(
      10000,
      0,
      "2027-03-19",
      fixedNow,
    );
    expect(result).toBe(1000);
  });

  it("returns 0 when target is already saved", () => {
    expect(
      suggestMonthlyContribution(1000, 1000, "2027-03-19", fixedNow),
    ).toBe(0);
  });

  it("returns null for missing or invalid inputs", () => {
    expect(suggestMonthlyContribution(0, 0, "2027-03-19", fixedNow)).toBeNull();
    expect(suggestMonthlyContribution(1000, 0, "", fixedNow)).toBeNull();
    expect(
      suggestMonthlyContribution(1000, 0, "bad-date", fixedNow),
    ).toBeNull();
  });

  it("returns full remaining amount when target lands in the current month", () => {
    expect(
      suggestMonthlyContribution(1000, 0, "2026-05-30", fixedNow),
    ).toBe(1000);
  });
});
