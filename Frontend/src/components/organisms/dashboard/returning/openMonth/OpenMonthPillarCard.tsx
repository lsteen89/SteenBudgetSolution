import { ArrowRight } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  amount: string;
  description: string;
  icon: React.ReactNode;
  actionLabel?: string;
  secondaryActionLabel?: string;
  actionState: "available" | "coming-soon";
  stateLabel: string;
  insight?: React.ReactNode;
  onAction?: () => void;
  onSecondaryAction?: () => void;
};

const OpenMonthPillarCard: React.FC<Props> = ({
  title,
  amount,
  description,
  icon,
  actionLabel,
  secondaryActionLabel,
  actionState,
  stateLabel,
  insight,
  onAction,
  onSecondaryAction,
}) => {
  const isAvailable = actionState === "available";

  return (
    <article className="flex min-h-[190px] rounded-2xl border border-eb-stroke/25 bg-white/70 px-4 py-3 shadow-sm transition hover:bg-white/85">
      <div className="flex flex-1 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] text-eb-accent">
          {icon}
        </div>

        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-eb-text">{title}</h3>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                isAvailable
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                  : "border-eb-stroke/30 bg-eb-surface text-eb-text/55",
              )}
            >
              {stateLabel}
            </span>
          </div>

          <p className="mt-1 text-xl font-extrabold tracking-tight text-eb-text tabular-nums">
            {amount}
          </p>
          <p className="mt-1 min-h-10 text-sm leading-5 text-eb-text/65">
            {description}
          </p>

          {insight ? <div className="mt-2">{insight}</div> : null}

          <div className="mt-auto flex min-h-9 flex-wrap justify-end gap-2 pt-3">
            {isAvailable ? (
              <>
                <button
                  type="button"
                  aria-label={actionLabel ? `${actionLabel} ${title}` : title}
                  onClick={onAction}
                  className="group inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-[0_8px_18px_rgba(21,39,81,0.08)] transition-[transform,background-color,border-color,box-shadow] duration-150 hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_12px_24px_rgba(21,39,81,0.10)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 active:translate-y-0 motion-reduce:transform-none"
                >
                  <span>{actionLabel}</span>
                </button>
                {secondaryActionLabel ? (
                  <button
                    type="button"
                    aria-label={`${secondaryActionLabel} ${title}`}
                    onClick={onSecondaryAction}
                    className="group inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-eb-accent/25 bg-[rgb(var(--eb-accent)/0.08)] px-3 text-sm font-semibold text-eb-accent shadow-[0_8px_18px_rgba(21,39,81,0.06)] transition-[transform,background-color,border-color,box-shadow] duration-150 hover:-translate-y-[1px] hover:border-eb-accent/35 hover:bg-[rgb(var(--eb-accent)/0.12)] hover:shadow-[0_12px_24px_rgba(21,39,81,0.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/20 active:translate-y-0 motion-reduce:transform-none"
                  >
                    <span>{secondaryActionLabel}</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none" />
                  </button>
                ) : null}
              </>
            ) : (
              <div className="h-9" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default OpenMonthPillarCard;
