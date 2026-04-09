import { cn } from "@/lib/utils";
import React, { useEffect, useMemo, useRef } from "react";
import EditPeriodFooter from "./EditPeriodFooter";
import EditPeriodHeader from "./EditPeriodHeader";
import EditPeriodSection from "./EditPeriodSection";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type EditPeriodDrawerProps = {
  open: boolean;
  periodLabel: string;
  periodDateRangeLabel: string;
  onClose: () => void;
  onSave?: () => void;
  isSaving?: boolean;
};

const EditPeriodDrawer: React.FC<EditPeriodDrawerProps> = ({
  open,
  periodLabel,
  periodDateRangeLabel,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const locale = useAppLocale();
  const currency = useAppCurrency();

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

  const recurringRows = useMemo(
    () => [
      { label: t("rent"), value: 1250 },
      { label: t("electricity"), value: 95 },
      { label: t("insurance"), value: 42 },
    ],
    [locale],
  );

  const subscriptionRows = useMemo(
    () => [
      { label: t("spotify"), value: 12 },
      { label: t("netflix"), value: 15 },
      { label: t("icloud"), value: 3 },
    ],
    [locale],
  );

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
            onClose={onClose}
          />

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="space-y-4 pb-6">
              <EditPeriodSection
                title={t("recurringExpensesTitle")}
                description={t("recurringExpensesDescription")}
              >
                <div className="space-y-3">
                  {recurringRows.map((row) => (
                    <PlaceholderRow
                      key={row.label}
                      label={row.label}
                      value={row.value}
                      locale={locale}
                      currency={currency}
                      metaText={t("placeholderRowMeta")}
                    />
                  ))}
                </div>
              </EditPeriodSection>

              <EditPeriodSection
                title={t("subscriptionsTitle")}
                description={t("subscriptionsDescription")}
              >
                <div className="space-y-3">
                  {subscriptionRows.map((row) => (
                    <PlaceholderRow
                      key={row.label}
                      label={row.label}
                      value={row.value}
                      locale={locale}
                      currency={currency}
                      metaText={t("placeholderRowMeta")}
                    />
                  ))}
                </div>
              </EditPeriodSection>
            </div>
          </div>

          <EditPeriodFooter
            onCancel={onClose}
            onSave={onSave ?? onClose}
            isSaving={isSaving}
            summaryText={t("summaryText")}
          />
        </div>
      </div>
    </div>
  );
};

type PlaceholderRowProps = {
  label: string;
  value: number;
  locale: string;
  currency: CurrencyCode;
  metaText: string;
};

const PlaceholderRow: React.FC<PlaceholderRowProps> = ({
  label,
  value,
  locale,
  currency,
  metaText,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-eb-stroke/25 bg-eb-surface px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-eb-text">{label}</div>
        <div className="text-xs text-eb-text/50">{metaText}</div>
      </div>

      <div className="shrink-0 text-sm font-bold tabular-nums text-eb-text">
        {formatMoneyV2(value, currency, locale, { fractionDigits: 2 })}
      </div>
    </div>
  );
};

export default EditPeriodDrawer;
