import type { AppLocale } from "@/types/i18n/appLocale";

import type { DashboardPeriodHeaderSummary } from "./dashboardSummary.types";
import { dashboardHeaderDict } from "@/utils/i18n/pages/private/dashboard/header/DashboardHeader.i18n";
import { tDict } from "@/utils/i18n/translate";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

export type CloseAvailability =
  | { kind: "ready"; label: string }
  | { kind: "countdown"; days: number; label: string }
  | { kind: "none" };

type HeaderInput = Pick<
  DashboardPeriodHeaderSummary,
  "periodStatus" | "lifecycleState" | "canCloseMonth" | "closeWindowOpensAt"
>;

/**
 * Resolve the calm "when can this month be closed?" label for the period
 * status row.
 *
 * Rules:
 *  - Closed/skipped months → no countdown.
 *  - Open + ready (`canCloseMonth`) → "Redo att stängas".
 *  - Open + close window in the future → "Månaden kan stängas om {n} dag(ar)".
 *    Negative or sub-day differences clamp to a single-day countdown so the
 *    user never sees a stale "0 days" or a negative number.
 *  - Missing `closeWindowOpensAt` for an open-not-ready month → no label
 *    (we silently fall back instead of fabricating a duration).
 */
export function getCloseAvailabilityLabel(
  header: HeaderInput,
  locale: AppLocale,
  now: Date = new Date(),
): CloseAvailability {
  const t = <K extends keyof typeof dashboardHeaderDict.sv>(key: K) =>
    tDict(key, locale, dashboardHeaderDict);

  if (header.periodStatus !== "open") {
    return { kind: "none" };
  }

  if (header.canCloseMonth) {
    return { kind: "ready", label: t("readyToClose") };
  }

  const opensAt = header.closeWindowOpensAt;
  if (!opensAt) {
    return { kind: "none" };
  }

  const opensAtDate = new Date(opensAt);
  if (Number.isNaN(opensAtDate.getTime())) {
    return { kind: "none" };
  }

  const msUntilOpen = opensAtDate.getTime() - now.getTime();
  // Clamp to at least 1 day so we never show "om 0 dagar" or a negative number
  // when the close window opens within the current day or has just slipped
  // past wall-clock without the backend yet flipping `canCloseMonth`.
  const days = Math.max(1, Math.ceil(msUntilOpen / ONE_DAY_IN_MS));

  const template =
    days === 1
      ? t("closeAvailabilityCountdownOne")
      : t("closeAvailabilityCountdownOther");

  return {
    kind: "countdown",
    days,
    label: template.replace("{count}", String(days)),
  };
}
