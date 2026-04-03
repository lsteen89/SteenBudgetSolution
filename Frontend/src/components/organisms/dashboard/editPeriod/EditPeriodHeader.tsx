import { X } from "lucide-react";
import React from "react";

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
  return (
    <div className="border-b border-eb-stroke/25 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-eb-text/45">
            Period editor
          </p>

          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-eb-text sm:text-2xl">
            Edit {periodLabel}
          </h2>

          <p className="mt-2 text-sm text-eb-text/65">{periodDateRangeLabel}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close period editor"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-surface text-eb-text/75 transition hover:bg-[rgb(var(--eb-shell)/0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default EditPeriodHeader;
