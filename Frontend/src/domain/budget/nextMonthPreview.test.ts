import { describe, expect, it } from "vitest";

import { deriveNextMonthPageState } from "./nextMonthPreview";

describe("deriveNextMonthPageState", () => {
  it("returns unavailable when there is no open month", () => {
    expect(
      deriveNextMonthPageState({
        openMonthYearMonth: null,
        months: [],
      }),
    ).toEqual({
      kind: "unavailable",
      fromYearMonth: null,
      targetYearMonth: null,
      targetMonth: null,
    });
  });

  it("returns preview when the immediate next month is not persisted", () => {
    expect(
      deriveNextMonthPageState({
        openMonthYearMonth: "2026-05",
        months: [{ yearMonth: "2026-05", status: "open", openedAt: "", closedAt: null }],
      }).kind,
    ).toBe("preview");
  });

  it("returns planned when the immediate next month is planned", () => {
    const state = deriveNextMonthPageState({
      openMonthYearMonth: "2026-05",
      months: [
        { yearMonth: "2026-05", status: "open", openedAt: "", closedAt: null },
        { yearMonth: "2026-06", status: "planned", openedAt: "", closedAt: null },
      ],
    });

    expect(state.kind).toBe("planned");
    expect(state.targetYearMonth).toBe("2026-06");
  });

  it("returns open when the immediate next month is already open", () => {
    const state = deriveNextMonthPageState({
      openMonthYearMonth: "2026-05",
      months: [
        { yearMonth: "2026-05", status: "open", openedAt: "", closedAt: null },
        { yearMonth: "2026-06", status: "open", openedAt: "", closedAt: null },
      ],
    });

    expect(state.kind).toBe("open");
    expect(state.targetYearMonth).toBe("2026-06");
  });
});
