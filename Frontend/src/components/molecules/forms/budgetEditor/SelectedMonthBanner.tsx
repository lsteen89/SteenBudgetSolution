import { ymLabel } from "@/domain/budget/nextMonthPreview";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { BudgetMonthStatus } from "@/types/budget/BudgetMonthsStatusDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { selectedMonthBannerDict } from "@/utils/i18n/components/budgetEditor/SelectedMonthBanner.i18n";
import { tDict } from "@/utils/i18n/translate";
import { CalendarClock, Lock } from "lucide-react";

type SelectedMonthBannerProps = {
  yearMonth: string;
  status: BudgetMonthStatus;
  /** True when the month differs from the user's open month. */
  isOffOpenMonth: boolean;
};

/**
 * Makes a non-default editor target unambiguous: which month the page edits,
 * and whether it accepts edits at all. Rendered by the full editor pages when
 * the resolved month is planned, read-only, or simply not the open month.
 * Renders nothing for the everyday case (editing the open month).
 */
export default function SelectedMonthBanner({
  yearMonth,
  status,
  isOffOpenMonth,
}: SelectedMonthBannerProps) {
  const locale = useAppLocale();

  if (status === "open" && !isOffOpenMonth) return null;

  const t = (key: keyof typeof selectedMonthBannerDict.sv) =>
    tDict(key, locale as AppLocale, selectedMonthBannerDict);

  const month = ymLabel(yearMonth, locale);
  const text =
    status === "planned"
      ? t("plannedNotice").replace("{month}", month)
      : status === "closed"
        ? t("readOnlyNotice").replace("{month}", month)
        : status === "skipped"
          ? t("skippedNotice").replace("{month}", month)
          : t("offOpenNotice").replace("{month}", month);

  const readOnly = status === "closed" || status === "skipped";
  const Icon = readOnly ? Lock : CalendarClock;

  return (
    <div
      data-testid="selected-month-banner"
      data-month-status={status}
      className={
        readOnly
          ? "flex items-center gap-2.5 rounded-2xl border border-eb-stroke/40 bg-eb-shell/15 px-4 py-3 text-sm text-eb-text/70"
          : "flex items-center gap-2.5 rounded-2xl border border-eb-accent/35 bg-eb-accentSoft/40 px-4 py-3 text-sm text-eb-text/80"
      }
    >
      <Icon size={16} aria-hidden className="shrink-0 text-eb-text/55" />
      <span>{text}</span>
    </div>
  );
}
