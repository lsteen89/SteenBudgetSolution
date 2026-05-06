import { ArrowRight, CheckCircle2, Lock, SkipForward } from "lucide-react";

import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import sheenStyles from "@/components/organisms/dashboard/returning/ReturningHeader.module.css";
import { cn } from "@/lib/utils";

export type PeriodActionSlotViewModel =
  | {
      type: "close";
      label: string;
      helperText?: string | null;
      attention?: boolean;
    }
  | {
      type: "continue";
      label: string;
      targetYearMonth: string;
      ariaLabel?: string;
    }
  | { type: "passive"; label: string; tone: "neutral" | "success" | "muted" }
  | { type: "none" };

type PassiveTone = Extract<
  PeriodActionSlotViewModel,
  { type: "passive" }
>["tone"];

type PeriodActionSlotProps = {
  action: PeriodActionSlotViewModel;
  isSwitchingMonth: boolean;
  onCloseMonth?: () => void;
  onContinueAction?: (yearMonth: string) => void;
};

const passiveToneClass = {
  neutral: "border-eb-stroke/25 bg-eb-surface/75 text-eb-text/62",
  success: "border-emerald-200/70 bg-emerald-50/70 text-emerald-800",
  muted: "border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.35)] text-eb-text/52",
} satisfies Record<PassiveTone, string>;

export default function PeriodActionSlot({
  action,
  isSwitchingMonth,
  onCloseMonth,
  onContinueAction,
}: PeriodActionSlotProps) {
  if (action.type === "none") return null;

  if (action.type === "close") {
    return (
      <div className="flex flex-col items-start sm:items-end">
        <CtaButton
          onClick={onCloseMonth}
          data-testid="close-month-cta"
          disabled={isSwitchingMonth || !onCloseMonth}
          className={cn(
            "h-10 min-w-[150px] rounded-2xl px-4",
            action.attention && sheenStyles.closeCtaSheen,
            isSwitchingMonth && "cursor-wait opacity-70",
          )}
        >
          <span className="relative z-10">{action.label}</span>
        </CtaButton>

        {action.helperText && (
          <div
            className={cn(
              "mt-1 px-1 text-xs",
              action.attention ? "text-amber-700" : "text-eb-text/45",
            )}
          >
            {action.helperText}
          </div>
        )}
      </div>
    );
  }

  if (action.type === "continue") {
    const handleClick = () => {
      if (!onContinueAction) return;
      onContinueAction(action.targetYearMonth);
    };
    return (
      <button
        type="button"
        data-testid="period-action-continue"
        onClick={handleClick}
        disabled={isSwitchingMonth || !onContinueAction}
        aria-label={action.ariaLabel ?? action.label}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-eb-stroke/25 bg-white px-4 text-sm font-extrabold text-eb-text shadow-[0_10px_22px_rgb(21_39_81_/_0.06)] transition-[background-color,color,box-shadow,transform] duration-150",
          "hover:bg-eb-text hover:text-white hover:shadow-[0_14px_30px_rgb(21_39_81_/_0.18)] active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <span className="truncate">{action.label}</span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      data-testid="period-action-passive"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-bold",
        passiveToneClass[action.tone],
      )}
    >
      {action.tone === "success" ? (
        <Lock className="h-3.5 w-3.5" />
      ) : action.tone === "muted" ? (
        <SkipForward className="h-3.5 w-3.5 text-eb-text/55" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      <span>{action.label}</span>
    </div>
  );
}
