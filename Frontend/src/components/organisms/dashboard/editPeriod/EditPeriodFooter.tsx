import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import React from "react";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { editPeriodFooterDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodFooter.i18n";
import { tDict } from "@/utils/i18n/translate";

type EditPeriodFooterProps = {
  onCancel: () => void;
  onSave: () => void;
  isSaving?: boolean;
  summaryText?: string;
};

const EditPeriodFooter: React.FC<EditPeriodFooterProps> = ({
  onCancel,
  onSave,
  isSaving = false,
  summaryText,
}) => {
  const locale = useAppLocale();

  const t = <K extends keyof typeof editPeriodFooterDict.sv>(key: K) =>
    tDict(key, locale, editPeriodFooterDict);

  return (
    <div className="sticky bottom-0 border-t border-eb-stroke/25 bg-eb-surface/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-eb-surface/80 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-6 text-sm text-eb-text/60">
          {summaryText ?? t("summaryFallback")}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/30 bg-eb-surface px-4 font-semibold text-eb-text/75 transition hover:bg-[rgb(var(--eb-shell)/0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
          >
            {t("cancel")}
          </button>

          <CtaButton
            onClick={onSave}
            disabled={isSaving}
            className="h-11 rounded-2xl px-5"
          >
            {isSaving ? t("saving") : t("save")}
          </CtaButton>
        </div>
      </div>
    </div>
  );
};

export default EditPeriodFooter;
