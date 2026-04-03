import { cn } from "@/lib/utils";
import React, { useEffect, useRef } from "react";
import EditPeriodFooter from "./EditPeriodFooter";
import EditPeriodHeader from "./EditPeriodHeader";
import EditPeriodSection from "./EditPeriodSection";

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

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Make sure the drawer overlay actually owns keyboard focus
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
        aria-label="Close period editor"
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
          aria-label={`Edit ${periodLabel}`}
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
                title="Recurring expenses"
                description="Update fixed monthly costs for this open period."
              >
                <div className="space-y-3">
                  <PlaceholderRow label="Rent" value="1 250 €" />
                  <PlaceholderRow label="Electricity" value="95 €" />
                  <PlaceholderRow label="Insurance" value="42 €" />
                </div>
              </EditPeriodSection>

              <EditPeriodSection
                title="Subscriptions"
                description="Adjust active subscriptions for this period."
              >
                <div className="space-y-3">
                  <PlaceholderRow label="Spotify" value="12 €" />
                  <PlaceholderRow label="Netflix" value="15 €" />
                  <PlaceholderRow label="iCloud" value="3 €" />
                </div>
              </EditPeriodSection>
            </div>
          </div>

          <EditPeriodFooter
            onCancel={onClose}
            onSave={onSave ?? onClose}
            isSaving={isSaving}
            summaryText="Changes apply to this open period only."
          />
        </div>
      </div>
    </div>
  );
};

type PlaceholderRowProps = {
  label: string;
  value: string;
};

const PlaceholderRow: React.FC<PlaceholderRowProps> = ({ label, value }) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-eb-stroke/25 bg-eb-surface px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-eb-text">{label}</div>
        <div className="text-xs text-eb-text/50">Placeholder row</div>
      </div>

      <div className="shrink-0 text-sm font-bold text-eb-text">{value}</div>
    </div>
  );
};

export default EditPeriodDrawer;
