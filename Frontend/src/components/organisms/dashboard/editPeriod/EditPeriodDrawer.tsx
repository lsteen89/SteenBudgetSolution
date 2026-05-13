import React, { useEffect, useRef } from "react";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { tDict } from "@/utils/i18n/translate";

import EditPeriodHeader from "./EditPeriodHeader";
import ExpensesPanel from "./expense/ExpensesPanel";
import IncomePanel from "./income/IncomePanel";

type EditPeriodDrawerProps = {
  open: boolean;
  yearMonth: string;
  periodLabel: string;
  periodDateRangeLabel: string;
  panel?: "expenses" | "income";
  onClose: () => void;
};

/**
 * Modal-style drawer that hosts the period editor. Today the only panel is
 * `ExpensesPanel`; income / savings / debt panels will plug into the same
 * shell as those slices come online.
 */
const EditPeriodDrawer: React.FC<EditPeriodDrawerProps> = ({
  open,
  yearMonth,
  periodLabel,
  periodDateRangeLabel,
  panel = "expenses",
  onClose,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const locale = useAppLocale();

  const t = <K extends keyof typeof editPeriodDrawerDict.sv>(key: K) =>
    tDict(key, locale, editPeriodDrawerDict);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      rootRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      aria-hidden={!open}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      className={cn(
        "fixed inset-0 z-[80] outline-none transition-all duration-300",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <button
        type="button"
        aria-label={t("closePeriodEditor")}
        onClick={onClose}
        className={cn(
          "absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <div className="pointer-events-none absolute inset-0 z-10 flex justify-end">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("editPeriodAriaLabel").replace(
            "{periodLabel}",
            periodLabel,
          )}
          className={cn(
            "pointer-events-auto flex h-full w-full flex-col bg-eb-surface shadow-[0_16px_60px_rgba(21,39,81,0.16)] transition-transform duration-300",
            "sm:max-w-[560px]",
            "rounded-none sm:rounded-l-[2rem]",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <EditPeriodHeader
            periodLabel={periodLabel}
            periodDateRangeLabel={periodDateRangeLabel}
            titleKey={panel === "income" ? "incomeTitle" : "title"}
            onClose={onClose}
          />

          {panel === "income" ? (
            <IncomePanel
              open={open}
              yearMonth={yearMonth}
              periodLabel={periodLabel}
              onClose={onClose}
            />
          ) : (
            <ExpensesPanel
              open={open}
              yearMonth={yearMonth}
              periodLabel={periodLabel}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPeriodDrawer;
