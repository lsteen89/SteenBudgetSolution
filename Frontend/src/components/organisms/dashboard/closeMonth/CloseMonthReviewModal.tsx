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
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import type {
  CloseMonthCarryOverMode,
  CloseMonthReviewState,
  CloseMonthSummary,
} from "@/hooks/dashboard/closeMonth.types";

type CloseMonthReviewModalProps = {
  open: boolean;
  periodLabel: string;
  periodMonthOnlyLabel: string;
  nextPeriodLabel: string;
  currency: CurrencyCode;
  reviewState: CloseMonthReviewState;
  summary: CloseMonthSummary;
  selectedCarryOverMode: CloseMonthCarryOverMode;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  onSelectCarryOverMode: (mode: CloseMonthCarryOverMode) => void;
};

const NEAR_ZERO = 0.005;

function formatSigned(
  value: number,
  sign: "+" | "-",
  currency: CurrencyCode,
  locale: string,
) {
  return `${sign}${formatMoneyV2(Math.abs(value), currency, locale)}`;
}

function formatAutoSigned(
  value: number,
  currency: CurrencyCode,
  locale: string,
) {
  if (value < 0) {
    return `-${formatMoneyV2(Math.abs(value), currency, locale)}`;
  }
  return `+${formatMoneyV2(value, currency, locale)}`;
}

export default function CloseMonthReviewModal({
  open,
  periodLabel,
  periodMonthOnlyLabel,
  nextPeriodLabel,
  currency,
  reviewState,
  summary,
  selectedCarryOverMode,
  isSubmitting = false,
  onClose,
  onConfirm,
  onSelectCarryOverMode,
}: CloseMonthReviewModalProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof closeMonthReviewModalDict.sv>(key: K) =>
    tDict(key, locale, closeMonthReviewModalDict);

  const [isDisclosureOpen, setIsDisclosureOpen] = useState(false);
  const disclosurePanelId = useId();

  const isPositiveRemaining = reviewState.state === "positiveRemaining";
  const isNegativeRemaining = reviewState.state === "negativeRemaining";

  const remainingLabel = formatMoneyV2(summary.remaining, currency, locale);
  const absoluteRemainingLabel = formatMoneyV2(
    Math.abs(reviewState.normalizedRemainingToSpend),
    currency,
    locale,
  );

  const title = t("title").replace("{month}", periodLabel);
  const confirmLabel = t("confirm").replace("{month}", periodLabel);

  const showIncomingCarryOver = Math.abs(summary.incomingCarryOver) >= NEAR_ZERO;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}
    >
      <DialogContent
        data-testid="close-month-modal"
        className={cn(
          "flex max-h-[calc(100dvh-4rem)] w-[min(720px,calc(100vw-2rem))] flex-col overflow-hidden",
          "rounded-3xl border-eb-stroke/20 bg-eb-surface p-0 shadow-[0_28px_80px_rgba(21,39,81,0.18)]",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.96))]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eb-text/45">
                {t("snapshotLabel")}
              </p>

              <DialogHeader className="mt-2 space-y-1.5 text-left">
                <DialogTitle className="text-[1.5rem] font-semibold tracking-tight text-eb-text sm:text-[1.625rem]">
                  {title}
                </DialogTitle>
                <DialogDescription className="max-w-xl text-sm leading-6 text-eb-text/65">
                  {t("description")}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-4 px-6 pb-6 sm:px-8">
              {isPositiveRemaining ? (
                <SurplusDecision
                  periodMonthOnlyLabel={periodMonthOnlyLabel}
                  nextPeriodLabel={nextPeriodLabel}
                  amountLabel={absoluteRemainingLabel}
                  selectedMode={selectedCarryOverMode}
                  onSelect={onSelectCarryOverMode}
                  t={t}
                />
              ) : null}

              {isNegativeRemaining ? (
                <p
                  data-testid="close-month-negative-notice"
                  className="text-sm leading-6 text-eb-text/72"
                >
                  {t("negativeNotice").replace(
                    "{amount}",
                    absoluteRemainingLabel,
                  )}
                </p>
              ) : null}

              <SummaryBlock
                title={t("summaryTitle")}
                labels={{
                  incomingCarryOver: t("summaryIncomingCarryOver"),
                  income: t("summaryIncome"),
                  expenses: t("summaryExpenses"),
                  savingsAndDebt: t("summarySavingsDebt"),
                  remaining: t("summaryRemaining"),
                }}
                summary={summary}
                currency={currency}
                locale={locale}
                remainingLabel={remainingLabel}
                showIncomingCarryOver={showIncomingCarryOver}
              />

              <p className="text-xs leading-5 text-eb-text/55">
                {t("adjustHint")}
              </p>

              <Disclosure
                isOpen={isDisclosureOpen}
                onToggle={() => setIsDisclosureOpen((prev) => !prev)}
                panelId={disclosurePanelId}
                summary={t("disclosureSummary")}
                body={t("disclosureBody")}
              />
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-eb-stroke/10 bg-white/85 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-8">
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
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SurplusDecisionProps = {
  periodMonthOnlyLabel: string;
  nextPeriodLabel: string;
  amountLabel: string;
  selectedMode: CloseMonthCarryOverMode;
  onSelect: (mode: CloseMonthCarryOverMode) => void;
  t: <K extends keyof typeof closeMonthReviewModalDict.sv>(key: K) => string;
};

function SurplusDecision({
  periodMonthOnlyLabel,
  nextPeriodLabel,
  amountLabel,
  selectedMode,
  onSelect,
  t,
}: SurplusDecisionProps) {
  const groupLabelId = useId();

  return (
    <section aria-labelledby={groupLabelId} className="space-y-2.5">
      <div id={groupLabelId} className="space-y-0.5">
        <p className="text-sm leading-6 text-eb-text/85">
          {t("surplusIntroLine1").replace("{amount}", amountLabel)}
        </p>
        <p className="text-sm leading-6 text-eb-text/60">
          {t("surplusIntroLine2").replace("{monthOnly}", periodMonthOnlyLabel)}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={groupLabelId}
        className="grid gap-2.5 sm:grid-cols-2"
      >
        <SurplusOption
          testId="resolve-carry-over"
          mode="full"
          selectedMode={selectedMode}
          onSelect={onSelect}
          title={t("optionCarryOverTitle").replace(
            "{nextMonth}",
            nextPeriodLabel,
          )}
          body={t("optionCarryOverBody")}
          selectedLabel={t("optionSelected")}
        />
        <SurplusOption
          testId="resolve-keep"
          mode="none"
          selectedMode={selectedMode}
          onSelect={onSelect}
          title={t("optionKeepTitle").replace(
            "{monthOnly}",
            periodMonthOnlyLabel,
          )}
          body={t("optionKeepBody").replace(
            "{monthOnly}",
            periodMonthOnlyLabel,
          )}
          selectedLabel={t("optionSelected")}
        />
      </div>
    </section>
  );
}

type SurplusOptionProps = {
  testId: string;
  mode: CloseMonthCarryOverMode;
  selectedMode: CloseMonthCarryOverMode;
  onSelect: (mode: CloseMonthCarryOverMode) => void;
  title: string;
  body: string;
  selectedLabel: string;
};

function SurplusOption({
  testId,
  mode,
  selectedMode,
  onSelect,
  title,
  body,
  selectedLabel,
}: SurplusOptionProps) {
  const selected = selectedMode === mode;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={testId}
      data-state={selected ? "selected" : "idle"}
      onClick={() => onSelect(mode)}
      className={cn(
        "group relative flex h-full flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left",
        "transition-colors duration-200 ease-out motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/35",
        selected
          ? "border-eb-accent/55 bg-emerald-500/[0.06]"
          : "border-eb-stroke/20 bg-white/85 hover:border-eb-stroke/35 hover:bg-white",
      )}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <span
          className={cn(
            "text-sm font-semibold tracking-tight transition-colors duration-200 ease-out motion-reduce:transition-none",
            selected ? "text-eb-text" : "text-eb-text/85",
          )}
        >
          {title}
        </span>
        <span
          aria-hidden
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ease-out motion-reduce:transition-none",
            selected
              ? "border-eb-accent bg-eb-accent text-white"
              : "border-eb-stroke/35 bg-white text-transparent",
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      </div>
      <span className="text-xs leading-5 text-eb-text/60">{body}</span>
      <span className="sr-only">{selected ? selectedLabel : ""}</span>
    </button>
  );
}

type SummaryBlockProps = {
  title: string;
  labels: {
    incomingCarryOver: string;
    income: string;
    expenses: string;
    savingsAndDebt: string;
    remaining: string;
  };
  summary: CloseMonthSummary;
  currency: CurrencyCode;
  locale: string;
  remainingLabel: string;
  showIncomingCarryOver: boolean;
};

function SummaryBlock({
  title,
  labels,
  summary,
  currency,
  locale,
  remainingLabel,
  showIncomingCarryOver,
}: SummaryBlockProps) {
  return (
    <section
      data-testid="close-month-summary"
      className="rounded-2xl bg-[rgb(var(--eb-shell)/0.20)] px-5 py-3.5"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-eb-text/55">
        {title}
      </h3>
      <dl className="mt-2.5 space-y-1.5">
        {showIncomingCarryOver ? (
          <SummaryRow
            testId="close-month-summary-incoming-carry-over"
            label={labels.incomingCarryOver}
            value={formatAutoSigned(summary.incomingCarryOver, currency, locale)}
          />
        ) : null}
        <SummaryRow
          testId="close-month-summary-income"
          label={labels.income}
          value={formatSigned(summary.income, "+", currency, locale)}
        />
        <SummaryRow
          testId="close-month-summary-expenses"
          label={labels.expenses}
          value={formatSigned(summary.expenses, "-", currency, locale)}
        />
        <SummaryRow
          testId="close-month-summary-savings-debt"
          label={labels.savingsAndDebt}
          value={formatSigned(summary.savingsAndDebt, "-", currency, locale)}
        />
        <div className="pt-1.5">
          <SummaryRow
            testId="close-month-summary-remaining"
            label={labels.remaining}
            value={remainingLabel}
            emphasized
          />
        </div>
      </dl>
    </section>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
  emphasized?: boolean;
  testId?: string;
};

function SummaryRow({
  label,
  value,
  emphasized = false,
  testId,
}: SummaryRowProps) {
  return (
    <div
      data-testid={testId}
      className="flex items-baseline justify-between gap-4"
    >
      <dt
        className={cn(
          "text-sm",
          emphasized ? "font-semibold text-eb-text" : "text-eb-text/72",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "tabular-nums tracking-tight",
          emphasized
            ? "text-base font-semibold text-eb-text"
            : "text-sm font-medium text-eb-text/85",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

type DisclosureProps = {
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
  summary: string;
  body: string;
};

function Disclosure({
  isOpen,
  onToggle,
  panelId,
  summary,
  body,
}: DisclosureProps) {
  return (
    <div data-testid="close-month-disclosure" className="pt-1">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-eb-text/55",
          "transition-colors duration-150 hover:text-eb-text/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/30",
        )}
      >
        <ChevronDown
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
        <span>{summary}</span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={panelId}
            data-testid="close-month-disclosure-panel"
            key="panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="pt-2 text-xs leading-5 text-eb-text/60">{body}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
