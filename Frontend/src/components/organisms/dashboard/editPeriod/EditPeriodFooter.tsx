import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import React from "react";

import { SecondaryButton } from "@/components/atoms/buttons/SecondaryButton";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { editPeriodFooterDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodFooter.i18n";
import { tDict } from "@/utils/i18n/translate";

type EditPeriodFooterProps = {
  onCancel: () => void;
  onSave: () => void;
  onOpenPlanning: () => void;
  isSaving?: boolean;
  isDisabled?: boolean;
  summaryText?: string;
};

const EditPeriodFooter: React.FC<EditPeriodFooterProps> = ({
  onCancel,
  onSave,
  onOpenPlanning,
  isSaving = false,
  isDisabled = false,
  summaryText,
}) => {
  const locale = useAppLocale();

  const t = <K extends keyof typeof editPeriodFooterDict.sv>(key: K) =>
    tDict(key, locale, editPeriodFooterDict);

  return (
    <div className="sticky bottom-0 border-t border-eb-stroke/25 bg-eb-surface/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-eb-surface/80 sm:px-6">
      <div className="flex flex-col gap-3">
        <div className="min-h-6 text-sm text-eb-text/60">
          {summaryText ?? t("summaryFallback")}
        </div>

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

export default EditPeriodFooter;
