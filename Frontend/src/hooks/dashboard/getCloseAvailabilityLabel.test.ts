import { describe, expect, it } from "vitest";

import { getCloseAvailabilityLabel } from "./getCloseAvailabilityLabel";

const NOW = new Date("2026-04-08T12:00:00Z");

const baseHeader = {
  periodStatus: "open" as const,
  lifecycleState: "normal" as const,
  canCloseMonth: false,
  closeWindowOpensAt: null as string | null,
};

describe("getCloseAvailabilityLabel", () => {
  it("returns 'ready' when the open month can be closed now", () => {
    const result = getCloseAvailabilityLabel(
      { ...baseHeader, canCloseMonth: true, lifecycleState: "eligible" },
      "en",
      NOW,
    );

    expect(result).toEqual({
      kind: "ready",
      label: "Ready to close",
    });
  });

  it("returns a 17-day plural countdown for the headline product example", () => {
    const result = getCloseAvailabilityLabel(
      {
        ...baseHeader,
        // 2026-04-25 is 17 calendar days after 2026-04-08.
        closeWindowOpensAt: "2026-04-25T12:00:00Z",
      },
      "sv",
      NOW,
    );

    expect(result).toMatchObject({
      kind: "countdown",
      days: 17,
      label: "Månaden kan stängas om 17 dagar",
    });
  });

  it("uses the singular form when exactly one day remains", () => {
    const result = getCloseAvailabilityLabel(
      {
        ...baseHeader,
        closeWindowOpensAt: "2026-04-09T12:00:00Z",
      },
      "sv",
      NOW,
    );

    expect(result).toMatchObject({
      kind: "countdown",
      days: 1,
      label: "Månaden kan stängas om 1 dag",
    });
  });

  it("clamps to 1 day when the close window opens within the same day or has just slipped past", () => {
    const result = getCloseAvailabilityLabel(
      {
        ...baseHeader,
        // 30 minutes ago — backend hasn't yet flipped canCloseMonth.
        closeWindowOpensAt: "2026-04-08T11:30:00Z",
      },
      "en",
      NOW,
    );

    expect(result).toMatchObject({
      kind: "countdown",
      days: 1,
      label: "The month can be closed in 1 day",
    });
  });

  it("returns no label for closed or skipped months", () => {
    expect(
      getCloseAvailabilityLabel(
        { ...baseHeader, periodStatus: "closed" },
        "en",
        NOW,
      ),
    ).toEqual({ kind: "none" });

    expect(
      getCloseAvailabilityLabel(
        { ...baseHeader, periodStatus: "skipped" },
        "en",
        NOW,
      ),
    ).toEqual({ kind: "none" });
  });

  it("returns no label when closeWindowOpensAt is missing or invalid", () => {
    expect(
      getCloseAvailabilityLabel(
        { ...baseHeader, closeWindowOpensAt: null },
        "en",
        NOW,
      ),
    ).toEqual({ kind: "none" });

    expect(
      getCloseAvailabilityLabel(
        { ...baseHeader, closeWindowOpensAt: "not-a-date" },
        "en",
        NOW,
      ),
    ).toEqual({ kind: "none" });
  });
});
