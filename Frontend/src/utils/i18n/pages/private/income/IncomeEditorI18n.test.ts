import { describe, expect, it } from "vitest";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { openMonthCommandCenterDict } from "@/utils/i18n/pages/private/dashboard/openMonth/OpenMonthCommandCenter.i18n";
import { incomeEditorPageDict } from "./IncomeEditorPage.i18n";
import { incomeItemModalDict } from "./IncomeItemModal.i18n";

const expectSameKeys = (dict: {
  sv: object;
  en: object;
  et: object;
}) => {
  const reference = Object.keys(dict.sv).sort();

  expect(Object.keys(dict.en).sort()).toEqual(reference);
  expect(Object.keys(dict.et).sort()).toEqual(reference);
};

describe("income editor i18n", () => {
  it("keeps sv/en/et keys aligned", () => {
    expectSameKeys(incomeEditorPageDict);
    expectSameKeys(incomeItemModalDict);
    expectSameKeys(editPeriodDrawerDict);
    expectSameKeys(openMonthCommandCenterDict);
  });
});
