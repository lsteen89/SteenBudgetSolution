import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BudgetEntryModalShellProps = {
  titleId: string;
  descriptionId: string;
  eyebrow: string;
  title: string;
  context?: string;
  description: string;
  closeAriaLabel: string;
  canClose: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  className?: string;
};

export default function BudgetEntryModalShell({
  titleId,
  descriptionId,
  eyebrow,
  title,
  context,
  description,
  closeAriaLabel,
  canClose,
  onClose,
  children,
  footer,
  className,
}: BudgetEntryModalShellProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        "relative flex max-h-[calc(100vh-2rem)] w-full max-w-[680px] flex-col overflow-hidden rounded-[2rem]",
        "border border-eb-stroke/25 bg-[rgb(var(--eb-shell))]",
        "shadow-[0_16px_60px_rgba(21,39,81,0.16)]",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-eb-surface">
        <div className="shrink-0 border-b border-eb-stroke/20 px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-eb-text/45">
                {eyebrow}
              </p>
              <h2
                id={titleId}
                className="mt-1 text-2xl font-black tracking-tight text-eb-text sm:text-[1.75rem]"
              >
                {title}
              </h2>
              {context ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-eb-text/45">
                  {context}
                </p>
              ) : null}
              <p id={descriptionId} className="mt-1 text-sm text-eb-text/60">
                {description}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={!canClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-eb-stroke/25 text-eb-text/65 transition hover:bg-[rgb(var(--eb-shell)/0.42)] hover:text-eb-text disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={closeAriaLabel}
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        <div className="shrink-0 border-t border-eb-stroke/16 bg-eb-surface/96 px-5 py-4 sm:px-6">
          {footer}
        </div>
      </div>
    </div>
  );
}
