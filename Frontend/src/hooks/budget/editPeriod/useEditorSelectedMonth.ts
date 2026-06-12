import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import type { BudgetMonthStatus } from "@/types/budget/BudgetMonthsStatusDto";

const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export type EditorSelectedMonth = {
  /**
   * The month the editor page reads and mutates. Defaults to the open month
   * when no `?yearMonth=` is present. Null while loading, when there is no
   * open month to default to, or when an explicit selection is invalid.
   */
  yearMonth: string | null;
  /** Status of the resolved month from `/months/status`. */
  status: BudgetMonthStatus | null;
  /** True when the URL carries an explicit `?yearMonth=` selection. */
  isExplicitSelection: boolean;
  /**
   * Explicit selection that is malformed or not a persisted month. Pages must
   * render a clear "month not found" state for this — never silently fall
   * back to the open month, or the user would edit a month they never chose.
   */
  isInvalidSelection: boolean;
  /** Open and planned months accept edits; closed/skipped are read-only. */
  isEditable: boolean;
  /** The open month differs from the resolved month (or there is none). */
  isOffOpenMonth: boolean;
  isLoading: boolean;
};

/**
 * Resolves which budget month a full editor page targets.
 *
 * Default (no query param) is the open month — the pre-PR-6 behavior. An
 * explicit `?yearMonth=YYYY-MM` targets that persisted month instead: open
 * and planned months stay editable, closed and skipped months render
 * read-only, and an unknown/malformed selection is reported as invalid so
 * the page can refuse instead of guessing.
 */
export function useEditorSelectedMonth(): EditorSelectedMonth {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("yearMonth");
  const monthsStatusQuery = useBudgetMonthsStatusQuery();

  return useMemo<EditorSelectedMonth>(() => {
    const status = monthsStatusQuery.data;

    if (monthsStatusQuery.isLoading || !status) {
      return {
        yearMonth: null,
        status: null,
        isExplicitSelection: requested !== null,
        isInvalidSelection: false,
        isEditable: false,
        isOffOpenMonth: false,
        isLoading: monthsStatusQuery.isLoading,
      };
    }

    const openYearMonth =
      status.openMonthYearMonth ??
      status.months.find((month) => month.status === "open")?.yearMonth ??
      null;

    if (requested === null) {
      const openStatus = openYearMonth
        ? (status.months.find((m) => m.yearMonth === openYearMonth)?.status ??
          "open")
        : null;

      return {
        yearMonth: openYearMonth,
        status: openStatus,
        isExplicitSelection: false,
        isInvalidSelection: false,
        isEditable: openStatus === "open" || openStatus === "planned",
        isOffOpenMonth: false,
        isLoading: false,
      };
    }

    const trimmed = requested.trim();
    const selected = YEAR_MONTH_PATTERN.test(trimmed)
      ? (status.months.find((month) => month.yearMonth === trimmed) ?? null)
      : null;

    if (!selected) {
      return {
        yearMonth: null,
        status: null,
        isExplicitSelection: true,
        isInvalidSelection: true,
        isEditable: false,
        isOffOpenMonth: true,
        isLoading: false,
      };
    }

    return {
      yearMonth: selected.yearMonth,
      status: selected.status,
      isExplicitSelection: true,
      isInvalidSelection: false,
      isEditable:
        selected.status === "open" || selected.status === "planned",
      isOffOpenMonth: selected.yearMonth !== openYearMonth,
      isLoading: false,
    };
  }, [monthsStatusQuery.data, monthsStatusQuery.isLoading, requested]);
}
