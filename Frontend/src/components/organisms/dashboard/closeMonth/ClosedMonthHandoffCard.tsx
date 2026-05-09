import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { CloseMonthCarryOverMode } from "@/hooks/dashboard/closeMonth.types";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { closedMonthHandoffCardDict } from "@/utils/i18n/pages/private/dashboard/closeMonth/ClosedMonthHandoffCard.i18n";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

export type ClosedMonthHandoffCardProps = {
  closedMonthLabel: string;
  nextMonthLabel: string;
  finalBalance: number;
  carryOverMode: CloseMonthCarryOverMode;
  carryOverAmount: number;
  currency: CurrencyCode;
  onContinue: () => void;
  onDismiss?: () => void;
};

// Treat anything within half an öre of zero as balanced. Mirrors the close
// modal's NEAR_ZERO so a tiny rounding artifact doesn't tip the copy into the
// surplus or deficit branch.
const NEAR_ZERO = 0.005;

type HandoffVariant =
  | "positiveFull"
  | "positiveKept"
  | "balanced"
  | "deficit";

function resolveVariant(
  finalBalance: number,
  carryOverMode: CloseMonthCarryOverMode,
): HandoffVariant {
  if (Math.abs(finalBalance) < NEAR_ZERO) return "balanced";
  if (finalBalance > 0) {
    return carryOverMode === "full" ? "positiveFull" : "positiveKept";
  }
  return "deficit";
}

function replaceTokens(
  template: string,
  tokens: Record<string, string>,
): string {
  return Object.entries(tokens).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(value),
    template,
  );
}

export default function ClosedMonthHandoffCard({
  closedMonthLabel,
  nextMonthLabel,
  finalBalance,
  carryOverMode,
  carryOverAmount,
  currency,
  onContinue,
  onDismiss,
}: ClosedMonthHandoffCardProps) {
  const locale = useAppLocale();
  const prefersReducedMotion = useReducedMotion();
  const t = <K extends keyof typeof closedMonthHandoffCardDict.sv>(key: K) =>
    tDict(key, locale, closedMonthHandoffCardDict);

  const variant = resolveVariant(finalBalance, carryOverMode);

  // Pick the amount that's most meaningful to surface in copy.
  // - Carried-over surplus → the amount that actually moved to next month
  // - Kept surplus → the closing month's final balance
  // - Deficit → signed final balance ("-750,00 kr")
  const amountForCopy =
    variant === "positiveFull"
      ? Math.max(carryOverAmount, 0)
      : variant === "positiveKept"
        ? Math.max(finalBalance, 0)
        : variant === "deficit"
          ? finalBalance
          : 0;

  const formattedAmount =
    variant === "deficit"
      ? `-${formatMoneyV2(Math.abs(amountForCopy), currency, locale)}`
      : formatMoneyV2(amountForCopy, currency, locale);

  const tokens = {
    month: closedMonthLabel,
    nextMonth: nextMonthLabel,
    amount: formattedAmount,
  };

  const title = replaceTokens(t("title"), tokens);
  const continueLabel = replaceTokens(t("continue"), tokens);

  const body = (() => {
    switch (variant) {
      case "positiveFull":
        return replaceTokens(t("bodyPositiveFull"), tokens);
      case "positiveKept":
        return replaceTokens(t("bodyPositiveKept"), tokens);
      case "deficit":
        return replaceTokens(t("bodyDeficit"), tokens);
      case "balanced":
      default:
        return replaceTokens(t("bodyBalanced"), tokens);
    }
  })();

  const motionInitial = prefersReducedMotion ? false : { opacity: 0, y: 6 };
  const motionAnimate = { opacity: 1, y: 0 };
  const motionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeOut" as const };

  return (
    <motion.aside
      data-testid="closed-month-handoff-card"
      data-variant={variant}
      role="status"
      aria-live="polite"
      initial={motionInitial}
      animate={motionAnimate}
      transition={motionTransition}
      className={cn(
        "relative flex w-full flex-col gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06]",
        "px-5 py-4 shadow-[0_10px_30px_rgba(21,39,81,0.06)] sm:flex-row sm:items-start sm:gap-4 sm:px-6",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
        <CheckCircle2 className="h-5 w-5" aria-hidden />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3
          data-testid="closed-month-handoff-title"
          className="text-base font-semibold tracking-tight text-eb-text"
        >
          {title}
        </h3>
        <p
          data-testid="closed-month-handoff-body"
          className="text-sm leading-6 text-eb-text/72"
        >
          {body}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <CtaButton
            type="button"
            data-testid="closed-month-handoff-continue"
            onClick={onContinue}
            className="bg-eb-accent hover:bg-eb-accent"
          >
            {continueLabel}
          </CtaButton>
        </div>
      </div>

      {onDismiss ? (
        <button
          type="button"
          data-testid="closed-month-handoff-dismiss"
          onClick={onDismiss}
          aria-label={t("dismissAria")}
          className={cn(
            "absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full",
            "text-eb-text/55 transition-colors duration-150 ease-out motion-reduce:transition-none",
            "hover:bg-white/70 hover:text-eb-text/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/35",
          )}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </motion.aside>
  );
}
