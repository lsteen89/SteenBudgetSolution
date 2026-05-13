import { describe, expect, it } from "vitest";
import { savingsEditorPageDict } from "./SavingsEditorPage.i18n";
import { savingsGoalModalDict } from "./SavingsGoalModal.i18n";

const expectSameKeys = (dict: { sv: object; en: object; et: object }) => {
  const reference = Object.keys(dict.sv).sort();

  expect(Object.keys(dict.en).sort()).toEqual(reference);
  expect(Object.keys(dict.et).sort()).toEqual(reference);
};

describe("savings editor i18n", () => {
  it("keeps sv/en/et keys aligned", () => {
    expectSameKeys(savingsEditorPageDict);
    expectSameKeys(savingsGoalModalDict);
  });
});
