import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { secondaryActionClass } from "@/components/atoms/buttons/ctaStyles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { closeMonthReviewModalDict } from "@/utils/i18n/pages/private/dashboard/closeMonth/CloseMonthReviewModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { ArrowRight, CheckCircle2, PencilLine, PiggyBank } from "lucide-react";

import type {
  CloseMonthReviewItem,
  CloseMonthReviewState,
  SurplusResolutionStatus,
} from "@/hooks/dashboard/closeMonth.types";

type CloseMonthReviewModalProps = {
  open: boolean;
  periodLabel: string;
  nextPeriodLabel: string;
  currency: CurrencyCode;
  reviewState: CloseMonthReviewState;
  reviewItems: CloseMonthReviewItem[];
  surplusResolutionStatus?: SurplusResolutionStatus;
  emergencyFundLabel?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  onResolveToEmergencyFund?: () => Promise<void> | void;
  onResolveToCarryOver?: () => Promise<void> | void;
};

export default function CloseMonthReviewModal({
  open,
  periodLabel,
  nextPeriodLabel,
  currency,
  reviewState,
  reviewItems,
  surplusResolutionStatus = "idle",
  emergencyFundLabel,
  isSubmitting = false,
  onClose,
  onConfirm,
  onResolveToEmergencyFund,
  onResolveToCarryOver,
}: CloseMonthReviewModalProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof closeMonthReviewModalDict.sv>(key: K) =>
    tDict(key, locale, closeMonthReviewModalDict);

  const absoluteRemaining = Math.abs(reviewState.normalizedRemainingToSpend);
  const absoluteRemainingLabel = formatMoneyV2(
    absoluteRemaining,
    currency,
    locale,
  );

  const fundLabel = emergencyFundLabel?.trim() || t("emergencyFundFallback");

  const isBalanced = reviewState.state === "balanced";
  const isPositiveRemaining = reviewState.state === "positiveRemaining";
  const isNegativeRemaining = reviewState.state === "negativeRemaining";

  const resolvingEmergencyFund =
    surplusResolutionStatus === "resolvingEmergencyFund";
  const resolvingCarryOver = surplusResolutionStatus === "resolvingCarryOver";
  const resolvedEmergencyFund =
    surplusResolutionStatus === "resolvedEmergencyFund";
  const resolvedCarryOver = surplusResolutionStatus === "resolvedCarryOver";
  const isResolved = resolvedEmergencyFund || resolvedCarryOver;

  const title = t("title").replace("{month}", periodLabel);
  const confirmLabel = t("confirm").replace("{month}", periodLabel);

  const footerNote = isBalanced
    ? t("footerBalanced").replace("{month}", periodLabel)
    : isPositiveRemaining && resolvedEmergencyFund
      ? t("footerResolvedEmergencyFund")
          .replace("{amount}", absoluteRemainingLabel)
          .replace("{fund}", fundLabel)
      : isPositiveRemaining && resolvedCarryOver
        ? t("footerResolvedCarryOver")
            .replace("{amount}", absoluteRemainingLabel)
            .replace("{month}", nextPeriodLabel)
        : isPositiveRemaining
          ? t("footerPositiveUnresolved")
              .replace("{amount}", absoluteRemainingLabel)
              .replace("{month}", periodLabel)
          : t("footerNegative")
              .replace("{amount}", absoluteRemainingLabel)
              .replace("{month}", periodLabel);

  const footerToneClass =
    isBalanced || isResolved
      ? "text-emerald-700"
      : isNegativeRemaining
        ? "text-red-700"
        : "text-eb-text/68";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}
    >
      <DialogContent
        data-testid="close-month-modal"
        className="w-[min(760px,calc(100vw-1.5rem))] border-eb-stroke/20 bg-eb-surface p-0 shadow-[0_28px_80px_rgba(21,39,81,0.18)]"
      >
        <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.96))]">
          <div className="border-b border-eb-stroke/15 px-6 py-6 sm:px-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-eb-text/45">
              {t("snapshotLabel")}
            </p>

            <DialogHeader className="mt-2 space-y-3 text-left">
              <DialogTitle className="text-2xl font-black tracking-tight text-eb-text sm:text-[2rem]">
                {title}
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-sm leading-6 text-eb-text/68">
                {t("description")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-7">
            {isBalanced ? (
              <div className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-5 shadow-[0_12px_36px_rgba(21,39,81,0.08)]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-eb-text">
                      {t("balancedHeadline")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-eb-text/70">
                      {t("balancedBody")}
                    </p>
                  </div>
                </div>
              </div>
            ) : isPositiveRemaining && !isResolved ? (
              <div className="rounded-[1.75rem] border border-eb-accent/20 bg-eb-accent/10 px-5 py-5 shadow-[0_12px_36px_rgba(21,39,81,0.08)]">
                <h3 className="text-xl font-black tracking-tight text-eb-text">
                  {t("positiveHeadline").replace(
                    "{amount}",
                    absoluteRemainingLabel,
                  )}
                </h3>
                <p className="mt-2 text-sm leading-6 text-eb-text/70">
                  {t("resolverBody")}
                </p>

                <div
                  className={cn(
                    "mt-4 grid gap-3",
                    onResolveToEmergencyFund && onResolveToCarryOver
                      ? "sm:grid-cols-2"
                      : "sm:grid-cols-1",
                  )}
                >
                  {onResolveToEmergencyFund ? (
                    <button
                      type="button"
                      data-testid="resolve-emergency-fund"
                      onClick={() => void onResolveToEmergencyFund()}
                      disabled={resolvingEmergencyFund || resolvingCarryOver}
                      className={cn(
                        "flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-eb-stroke/20 bg-white px-4 text-sm font-semibold text-eb-text shadow-[0_10px_24px_rgba(21,39,81,0.07)] transition",
                        "hover:border-eb-accent/30 hover:bg-white/90",
                        "disabled:cursor-not-allowed disabled:opacity-55",
                      )}
                    >
                      <PiggyBank className="h-4 w-4" />
                      <span>
                        {resolvingEmergencyFund
                          ? t("resolvingEmergencyFund").replace(
                              "{fund}",
                              fundLabel,
                            )
                          : t("addToEmergencyFund").replace(
                              "{fund}",
                              fundLabel,
                            )}
                      </span>
                    </button>
                  ) : null}

                  {onResolveToCarryOver ? (
                    <button
                      type="button"
                      data-testid="resolve-carry-over"
                      onClick={() => void onResolveToCarryOver()}
                      disabled={resolvingEmergencyFund || resolvingCarryOver}
                      className={cn(
                        "flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-eb-stroke/20 bg-white px-4 text-sm font-semibold text-eb-text shadow-[0_10px_24px_rgba(21,39,81,0.07)] transition",
                        "hover:border-eb-accent/30 hover:bg-white/90",
                        "disabled:cursor-not-allowed disabled:opacity-55",
                      )}
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>
                        {resolvingCarryOver
                          ? t("resolvingCarryOver").replace(
                              "{month}",
                              nextPeriodLabel,
                            )
                          : t("carryOverToNext").replace(
                              "{month}",
                              nextPeriodLabel,
                            )}
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : isPositiveRemaining && resolvedEmergencyFund ? (
              <div className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-5 shadow-[0_12px_36px_rgba(21,39,81,0.08)]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-eb-text">
                      {t("resolvedEmergencyFundHeadline")
                        .replace("{amount}", absoluteRemainingLabel)
                        .replace("{fund}", fundLabel)}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-eb-text/70">
                      {t("resolvedEmergencyFundBody")}
                    </p>
                  </div>
                </div>
              </div>
            ) : isPositiveRemaining && resolvedCarryOver ? (
              <div className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-5 shadow-[0_12px_36px_rgba(21,39,81,0.08)]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-eb-text">
                      {t("resolvedCarryOverHeadline")
                        .replace("{amount}", absoluteRemainingLabel)
                        .replace("{month}", nextPeriodLabel)}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-eb-text/70">
                      {t("resolvedCarryOverBody")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-red-400/20 bg-red-500/10 px-5 py-5 shadow-[0_12px_36px_rgba(21,39,81,0.08)]">
                <h3 className="text-xl font-black tracking-tight text-eb-text">
                  {t("negativeHeadline").replace(
                    "{amount}",
                    absoluteRemainingLabel,
                  )}
                </h3>
                <p className="mt-2 text-sm leading-6 text-eb-text/70">
                  {t("negativeBody")}
                </p>
              </div>
            )}

            <section className="rounded-[1.5rem] border border-eb-stroke/15 bg-[rgb(var(--eb-shell)/0.28)] px-5 py-4">
              <h3 className="text-sm font-semibold text-eb-text">
                {t("checklistTitle")}
              </h3>

              <div className="mt-3 divide-y divide-eb-stroke/10">
                {reviewItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-eb-text">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-sm text-eb-text/65">
                        {formatMoneyV2(item.amount, currency, locale)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={item.onEdit}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-eb-accent transition hover:bg-white/70 hover:text-eb-accent/80"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      {t("edit")}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-eb-stroke/10 pt-5">
              <p className={cn("text-sm leading-6", footerToneClass)}>
                {footerNote}
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className={secondaryActionClass}
                >
                  {t("cancel")}
                </button>

                <CtaButton
                  type="button"
                  data-testid="confirm-close-month"
                  onClick={() => void onConfirm()}
                  disabled={isSubmitting}
                  className="bg-eb-accent hover:bg-eb-accent"
                >
                  {confirmLabel}
                </CtaButton>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
