import { X } from "lucide-react";
import React from "react";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { editPeriodHeaderDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodHeader.i18n";
import { tDict } from "@/utils/i18n/translate";

type EditPeriodHeaderProps = {
  periodLabel: string;
  periodDateRangeLabel: string;
  onClose: () => void;
};

const EditPeriodHeader: React.FC<EditPeriodHeaderProps> = ({
  periodLabel,
  periodDateRangeLabel,
  onClose,
}) => {
  const locale = useAppLocale();

  const t = <K extends keyof typeof editPeriodHeaderDict.sv>(key: K) =>
    tDict(key, locale, editPeriodHeaderDict);

  const title = t("title").replace("{periodLabel}", periodLabel);

  return (
    <div className="border-b border-eb-stroke/25 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-eb-text/45">
            {t("eyebrow")}
          </p>

          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-eb-text sm:text-2xl">
            {title}
          </h2>

          <p className="mt-2 text-sm text-eb-text/65">{periodDateRangeLabel}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("closeAriaLabel")}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-surface text-eb-text/75 transition hover:bg-[rgb(var(--eb-shell)/0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default EditPeriodHeader;
