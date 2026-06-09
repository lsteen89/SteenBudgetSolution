import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import React from "react";

import { SecondaryButton } from "@/components/atoms/buttons/SecondaryButton";
import type { DashboardTerms } from "@/domain/budget/dashboardTerms";
import {
  type QuickEditDomain,
  quickEditBaseFree,
  quickEditProjectedDelta,
  quickEditProjectedFree,
} from "@/domain/budget/quickEditProjection";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/types/i18n/currency";
import { editPeriodFooterDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodFooter.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

/**
 * Shared Quick Edit projection input.
 *
 * Panels report:
 *   - `terms`              dashboard six-term equation (income, carryOver,
 *                          expenses, savings, debts, remaining)
 *   - `domain`             which Quick Edit tab is active
 *   - `baseDomainTotal`    sum the panel's rendered rows currently contribute
 *                          to the dashboard's domain total
 *   - `draftDomainTotal`   same sum with the panel's drafts applied
 *
 * The footer renders `baseFree → projectedFree` using the active domain's
 * sign. Cross-domain delta is intentionally not shown: PR B preserves the
 * active-tab-save contract from PR A. The displayed `baseFree` mirrors
 * `terms.remaining` so the projection never disagrees with the dashboard.
 */
export type QuickEditFooterProjection = {
  terms: DashboardTerms;
  domain: QuickEditDomain;
  baseDomainTotal: number;
  draftDomainTotal: number;
  currency: CurrencyCode;
  hasChanges: boolean;
  hasValidationErrors?: boolean;
  readOnly?: boolean;
};

type EditPeriodFooterProps = {
  onCancel: () => void;
  onSave: () => void;
  onOpenPlanning: () => void;
  isSaving?: boolean;
  isDisabled?: boolean;
  summaryText?: string;
  /**
   * Active-domain money projection. When provided, the footer renders a
   * "free this month: base → projected" preview tied to the six-term
   * dashboard equation. `summaryText` is used as the fallback when no
   * projection is provided (e.g. legacy callers).
   */
  projection?: QuickEditFooterProjection;
};

const EditPeriodFooter: React.FC<EditPeriodFooterProps> = ({
  onCancel,
  onSave,
  onOpenPlanning,
  isSaving = false,
  isDisabled = false,
  summaryText,
  projection,
}) => {
  const locale = useAppLocale();

  const t = <K extends keyof typeof editPeriodFooterDict.sv>(key: K) =>
    tDict(key, locale, editPeriodFooterDict);

  return (
    <div className="sticky bottom-0 border-t border-eb-stroke/25 bg-eb-surface/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-eb-surface/80 sm:px-6">
      <div className="flex flex-col gap-3">
        {projection ? (
          <ProjectionLine
            projection={projection}
            locale={locale}
            label={t("projectionLabel")}
            readOnlySuffix={t("projectionReadOnlySuffix")}
            fallback={summaryText ?? t("summaryFallback")}
          />
        ) : (
          <div className="min-h-6 text-sm text-eb-text/60">
            {summaryText ?? t("summaryFallback")}
          </div>
        )}

        <CtaButton
          onClick={onSave}
          disabled={isSaving || isDisabled}
          className={cn(
            "h-11 w-full rounded-2xl px-5",
            (isSaving || isDisabled) && "cursor-not-allowed opacity-50",
          )}
        >
          {isSaving ? t("saving") : t("save")}
        </CtaButton>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-eb-stroke/30 bg-eb-surface px-4 font-semibold text-eb-text/75 transition hover:bg-[rgb(var(--eb-shell)/0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 disabled:opacity-60"
          >
            {t("cancel")}
          </button>

          <SecondaryButton
            onClick={onOpenPlanning}
            disabled={isSaving}
            className="h-11 flex-1 rounded-2xl px-4"
          >
            {t("openPlanning")}
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
};

type ProjectionLineProps = {
  projection: QuickEditFooterProjection;
  locale: ReturnType<typeof useAppLocale>;
  label: string;
  readOnlySuffix: string;
  fallback: string;
};

const ProjectionLine: React.FC<ProjectionLineProps> = ({
  projection,
  locale,
  label,
  readOnlySuffix,
  fallback,
}) => {
  const {
    terms,
    domain,
    baseDomainTotal,
    draftDomainTotal,
    currency,
    hasChanges,
    hasValidationErrors,
    readOnly,
  } = projection;

  const baseFree = quickEditBaseFree(terms);
  const projectedFree = quickEditProjectedFree(
    terms,
    domain,
    baseDomainTotal,
    draftDomainTotal,
  );
  const delta = quickEditProjectedDelta(
    domain,
    baseDomainTotal,
    draftDomainTotal,
  );

  const formattedBase = formatMoneyV2(baseFree, currency, locale, {
    fractionDigits: 2,
  });
  const formattedProjected = formatMoneyV2(projectedFree, currency, locale, {
    fractionDigits: 2,
  });
  const formattedDelta = formatMoneyV2(Math.abs(delta), currency, locale, {
    fractionDigits: 2,
  });
  const deltaSign = delta >= 0 ? "+" : "−";

  // Read-only months never project — show baseFree only, with a quiet
  // suffix that makes the read-only state explicit.
  if (readOnly) {
    return (
      <div
        className="min-h-6 text-sm text-eb-text/60"
        data-testid="quick-edit-projection"
        data-projection-state="readOnly"
      >
        <span className="font-medium text-eb-text/75">{label}:</span>{" "}
        <span className="tabular-nums">{formattedBase}</span>{" "}
        <span className="text-eb-text/55">({readOnlySuffix})</span>
      </div>
    );
  }

  // Validation errors are surfaced through the legacy summaryText path:
  // the projection number cannot be trusted while inputs are invalid.
  if (hasValidationErrors) {
    return (
      <div
        className="min-h-6 text-sm text-eb-danger"
        data-testid="quick-edit-projection"
        data-projection-state="invalid"
      >
        {fallback}
      </div>
    );
  }

  // `hasChanges` is row-level (the panel saw a draft amount differ from the
  // rendered amount). The projection's `delta` is the dashboard-level
  // delta — it can be zero even when row-level changes exist (e.g. the
  // edited row does not count toward the dashboard's domain total, like
  // an inactive income row). When the dashboard wouldn't move, render
  // the calm "unchanged" state — promising "→" with a +0 chip would be
  // visual noise pretending to be information.
  if (!hasChanges || delta === 0) {
    return (
      <div
        className="min-h-6 text-sm text-eb-text/60"
        data-testid="quick-edit-projection"
        data-projection-state="unchanged"
      >
        <span className="font-medium text-eb-text/75">{label}:</span>{" "}
        <span className="tabular-nums">{formattedBase}</span>
      </div>
    );
  }

  const deltaTone =
    delta > 0
      ? "text-eb-accent"
      : delta < 0
        ? "text-eb-danger"
        : "text-eb-text/55";

  return (
    <div
      className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-eb-text/65"
      data-testid="quick-edit-projection"
      data-projection-state="changed"
    >
      <span className="font-medium text-eb-text/80">{label}:</span>
      <span className="tabular-nums text-eb-text/55">{formattedBase}</span>
      <span aria-hidden="true" className="text-eb-text/45">
        →
      </span>
      <span className="tabular-nums font-semibold text-eb-text">
        {formattedProjected}
      </span>
      <span
        className={cn("tabular-nums text-xs font-semibold", deltaTone)}
        data-testid="quick-edit-projection-delta"
      >
        ({deltaSign}
        {formattedDelta})
      </span>
    </div>
  );
};

export default EditPeriodFooter;
