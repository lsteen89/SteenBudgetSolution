import { describe, expect, it } from "vitest";
import type { DebtEditorDisabledReason } from "@/types/budget/DebtEditorDto";
import { primaryReason, reasonKeyFor } from "./debtEditorReason";

const ALL_CODES: readonly DebtEditorDisabledReason[] = [
  "monthClosed",
  "monthSkipped",
  "rowRemoved",
  "rowDeleted",
  "rowClosed",
  "monthOnlyNoPlan",
  "sourceMissing",
  "sourcePaidOff",
  "sourceArchived",
  "sourceDeleted",
  "alreadyIncluded",
  "alreadyNotIncluded",
  "sourceLinkedHistoryExists",
];

describe("reasonKeyFor", () => {
  it("maps every backend code to a dictionary key", () => {
    for (const code of ALL_CODES) {
      expect(reasonKeyFor(code)).not.toBeNull();
    }
  });
});

describe("primaryReason", () => {
  it("returns null for an empty list", () => {
    expect(primaryReason([])).toBeNull();
  });

  it("prefers month-level blockers over row- and source-level codes", () => {
    expect(
      primaryReason(["sourcePaidOff", "monthClosed", "alreadyIncluded"]),
    ).toBe("monthClosed");
    expect(primaryReason(["sourcePaidOff", "monthSkipped"])).toBe(
      "monthSkipped",
    );
  });

  it("prefers row-immutability codes over source lifecycle codes", () => {
    expect(primaryReason(["sourcePaidOff", "rowDeleted"])).toBe("rowDeleted");
    expect(primaryReason(["sourceArchived", "rowRemoved"])).toBe("rowRemoved");
  });

  it("prefers source lifecycle terminations over plan-shape codes", () => {
    expect(primaryReason(["monthOnlyNoPlan", "sourcePaidOff"])).toBe(
      "sourcePaidOff",
    );
  });

  it("falls back to participation no-op codes when nothing else applies", () => {
    expect(primaryReason(["alreadyNotIncluded"])).toBe("alreadyNotIncluded");
  });
});
