import { describe, expect, it } from "vitest";
import { debtsEditorPageDict } from "./DebtsEditorPage.i18n";
import { debtPlannedPaymentModalDict } from "./DebtPlannedPaymentModal.i18n";
import { debtBalanceModalDict } from "./DebtBalanceModal.i18n";
import { debtProgressModalDict } from "./DebtProgressModal.i18n";

const expectSameKeys = (dict: { sv: object; en: object; et: object }) => {
  const reference = Object.keys(dict.sv).sort();

  expect(Object.keys(dict.en).sort()).toEqual(reference);
  expect(Object.keys(dict.et).sort()).toEqual(reference);
};

describe("debts editor i18n", () => {
  it("keeps sv/en/et keys aligned", () => {
    expectSameKeys(debtsEditorPageDict);
    expectSameKeys(debtPlannedPaymentModalDict);
    expectSameKeys(debtBalanceModalDict);
    expectSameKeys(debtProgressModalDict);
  });
});
