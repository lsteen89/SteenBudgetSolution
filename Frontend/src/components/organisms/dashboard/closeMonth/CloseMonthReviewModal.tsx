import CalcBird from "@assets/Images/CalcBird.png";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { secondaryActionClass } from "@/components/atoms/buttons/ctaStyles";
import { YearChapterStrip } from "@/components/atoms/dashboard/YearChapterStrip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCountUp } from "@/hooks/animation/useCountUp";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { closeMonthReviewModalDict } from "@/utils/i18n/pages/private/dashboard/closeMonth/CloseMonthReviewModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import type {
  CloseMonthCarryOverMode,
  CloseMonthReviewState,
  CloseMonthSummary,
} from "@/hooks/dashboard/closeMonth.types";
import type { SavingsGoalCompletionCandidateDto } from "@/types/budget/SavingsGoalCompletionCandidateDto";

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
  completionCandidates?: SavingsGoalCompletionCandidateDto[];
  selectedCompletionGoalIds?: Set<string>;
  onToggleCompletionGoal?: (goalId: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  onSelectCarryOverMode: (mode: CloseMonthCarryOverMode) => void;
  // Presentational extras for the chapter ribbon + year strip. Optional so
  // older call sites and tests keep rendering without them.
  closedMonthsInYear?: number;
  yearMonthList?: readonly string[];
};

const NEAR_ZERO = 0.005;

const EMPTY_SELECTION: ReadonlySet<string> = new Set();

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
  completionCandidates,
  selectedCompletionGoalIds,
  onToggleCompletionGoal,
  onClose,
  onConfirm,
  onSelectCarryOverMode,
  closedMonthsInYear = 0,
  yearMonthList,
}: CloseMonthReviewModalProps) {
  const locale = useAppLocale();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const t = <K extends keyof typeof closeMonthReviewModalDict.sv>(key: K) =>
    tDict(key, locale, closeMonthReviewModalDict);

  const [isDisclosureOpen, setIsDisclosureOpen] = useState(false);
  const disclosurePanelId = useId();

  const isPositiveRemaining = reviewState.state === "positiveRemaining";
  const isNegativeRemaining = reviewState.state === "negativeRemaining";
  const isBalanced = reviewState.state === "balanced";

  const remainingLabel = formatMoneyV2(summary.remaining, currency, locale);
  const absoluteRemainingLabel = formatMoneyV2(
    Math.abs(reviewState.normalizedRemainingToSpend),
    currency,
    locale,
  );

  const title = t("title").replace("{month}", periodLabel);
  const confirmLabel = t("confirm").replace("{month}", periodLabel);
  const chapterRibbon = t("chapterRibbon").replace(
    "{closed}",
    String(closedMonthsInYear + 1),
  );
  const footerNote = t("footerNote").replace("{month}", periodLabel);

  const showIncomingCarryOver = Math.abs(summary.incomingCarryOver) >= NEAR_ZERO;

  // Snap to target when reduced motion is requested or the hero is not
  // visible. Hook still runs on every render for stable ordering.
  const heroAnimationEnabled = open && isPositiveRemaining && !prefersReducedMotion;
  const animatedHero = useCountUp(summary.remaining, 1100, heroAnimationEnabled);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}
    >
      <DialogContent
        data-testid="close-month-modal"
        data-reduce-motion={prefersReducedMotion ? "true" : undefined}
        className={cn(
          "flex max-h-[calc(100dvh-3rem)] w-[min(780px,calc(100vw-2rem))] flex-col overflow-hidden",
          "rounded-3xl border-eb-stroke/20 bg-eb-surface p-0 shadow-[0_28px_80px_rgba(21,39,81,0.18)]",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.96))]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChapterRibbon
              kicker={chapterRibbon}
              title={title}
              description={t("description")}
              snapshotLabel={t("snapshotLabel")}
              closedThrough={closedMonthsInYear}
              yearMonthList={yearMonthList}
              locale={locale}
            />

            <div className="space-y-5 px-6 pb-6 sm:px-8">
              {isPositiveRemaining ? (
                <Hero
                  variant="positive"
                  kicker={t("heroLabel")}
                  amountLabel={formatMoneyV2(
                    isPositiveRemaining ? animatedHero : summary.remaining,
                    currency,
                    locale,
                  )}
                  finalAmountLabel={remainingLabel}
                  lead={t("heroLeadPositive").replace(
                    "{month}",
                    periodMonthOnlyLabel,
                  )}
                  reduceMotion={prefersReducedMotion}
                />
              ) : null}

              {isNegativeRemaining ? (
                <Hero
                  variant="negative"
                  kicker={t("heroLabel")}
                  amountLabel={`-${absoluteRemainingLabel}`}
                  finalAmountLabel={`-${absoluteRemainingLabel}`}
                  lead={t("heroLeadNegative").replace(
                    "{month}",
                    periodMonthOnlyLabel,
                  )}
                  reduceMotion={prefersReducedMotion}
                />
              ) : null}

              {isPositiveRemaining ? (
                <HeroDecision
                  nextPeriodLabel={nextPeriodLabel}
                  periodMonthOnlyLabel={periodMonthOnlyLabel}
                  amountLabel={absoluteRemainingLabel}
                  selectedMode={selectedCarryOverMode}
                  onSelect={onSelectCarryOverMode}
                  t={t}
                />
              ) : null}

              {isNegativeRemaining ? (
                <p
                  data-testid="close-month-negative-notice"
                  className="sr-only"
                >
                  {t("negativeNotice").replace(
                    "{amount}",
                    absoluteRemainingLabel,
                  )}
                </p>
              ) : null}

              <StatStrip
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
                emphasizeRemaining={!isBalanced}
              />

              <p className="text-xs leading-5 text-eb-text/55">
                {t("adjustHint")}
              </p>

              {completionCandidates && completionCandidates.length > 0 ? (
                <CompletionCandidatesSection
                  candidates={completionCandidates}
                  selectedIds={selectedCompletionGoalIds ?? EMPTY_SELECTION}
                  onToggle={onToggleCompletionGoal}
                  isSubmitting={isSubmitting}
                  currency={currency}
                  locale={locale}
                  t={t}
                />
              ) : null}

              <Disclosure
                isOpen={isDisclosureOpen}
                onToggle={() => setIsDisclosureOpen((prev) => !prev)}
                panelId={disclosurePanelId}
                summary={t("disclosureSummary")}
                body={t("disclosureBody")}
              />
            </div>
          </div>

          <footer className="grid gap-3 border-t border-eb-stroke/10 bg-white/85 px-6 py-4 backdrop-blur sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-8">
            <span className="max-w-[22rem] text-xs leading-5 text-eb-text/55">
              {footerNote}
            </span>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className={cn(secondaryActionClass, "whitespace-nowrap sm:min-w-28")}
              >
                {t("cancel")}
              </button>

              <CtaButton
                type="button"
                data-testid="confirm-close-month"
                onClick={() => void onConfirm()}
                disabled={isSubmitting}
                className="min-w-[10.5rem] whitespace-nowrap bg-eb-accent hover:bg-eb-accent"
              >
                <span className="whitespace-nowrap">{confirmLabel}</span>
                <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              </CtaButton>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ChapterRibbonProps = {
  kicker: string;
  title: string;
  description: string;
  snapshotLabel: string;
  closedThrough: number;
  yearMonthList: readonly string[] | undefined;
  locale: string;
};

function ChapterRibbon({
  kicker,
  title,
  description,
  snapshotLabel,
  closedThrough,
  yearMonthList,
  locale,
}: ChapterRibbonProps) {
  return (
    <div
      data-testid="close-month-chapter-ribbon"
      className={cn(
        "border-b border-eb-stroke/15 px-6 pt-6 pr-14 pb-4 sm:px-8 sm:pr-14 sm:pt-7",
        "bg-[linear-gradient(180deg,rgb(var(--eb-shell)/0.45),rgb(var(--eb-shell)/0.10))]",
      )}
    >
      <div className="flex flex-col gap-4">
        <DialogHeader className="min-w-0 space-y-1 text-left">
          <p
            data-testid="close-month-chapter-kicker"
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-eb-text/55"
          >
            {kicker}
          </p>
          <DialogTitle className="max-w-[30rem] text-[1.75rem] font-semibold leading-tight tracking-tight text-eb-text sm:text-[2rem]">
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
          <span className="sr-only">{snapshotLabel}</span>
        </DialogHeader>
        <div className="hidden w-full max-w-[38rem] sm:block">
          <YearChapterStrip
            closedThrough={closedThrough}
            yearMonthList={yearMonthList}
            locale={locale}
            highlight
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

type HeroProps = {
  variant: "positive" | "negative";
  kicker: string;
  amountLabel: string;
  finalAmountLabel: string;
  lead: string;
  reduceMotion: boolean;
};

function Hero({
  variant,
  kicker,
  amountLabel,
  finalAmountLabel,
  lead,
  reduceMotion,
}: HeroProps) {
  const isPositive = variant === "positive";
  return (
    <section
      data-testid="close-month-hero"
      data-variant={variant}
      className="relative isolate overflow-hidden rounded-3xl border border-eb-stroke/15 bg-white/85 px-5 py-6 text-center sm:px-8"
    >
      {isPositive && !reduceMotion ? <HeroHalo /> : null}
      {isPositive ? (
        <img
          src={CalcBird}
          alt=""
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-6 top-6 hidden h-16 w-16 select-none object-contain md:block lg:h-20 lg:w-20",
            "drop-shadow-[0_10px_20px_rgba(21,39,81,0.12)]",
            reduceMotion ? null : "cm-mascot-float",
          )}
        />
      ) : null}

      <div className="relative flex flex-col items-center gap-2">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.22em]",
            isPositive ? "text-eb-accent/75" : "text-rose-700/70",
          )}
        >
          {kicker}
        </p>
        <div
          data-testid="close-month-hero-amount"
          aria-live="polite"
          className={cn(
            "max-w-full whitespace-nowrap tabular-nums text-[2.35rem] font-extrabold leading-[1.05] tracking-tight sm:text-[3rem]",
            isPositive ? "text-eb-accent" : "text-rose-700",
          )}
          // Screen readers and tests read the settled value; the visual layer
          // shows the (possibly animating) amountLabel.
          aria-label={finalAmountLabel}
        >
          {amountLabel}
        </div>
        <p className="mt-1 max-w-[28rem] text-sm leading-6 text-eb-text/65">
          {lead}
        </p>
      </div>
    </section>
  );
}

function HeroHalo() {
  return (
    <span
      aria-hidden
      className="cm-hero-halo pointer-events-none absolute left-1/2 top-8 -z-10 h-44 w-[22rem] -translate-x-1/2 rounded-full blur-[2px]"
      style={{
        background:
          "radial-gradient(closest-side, rgb(var(--eb-accent) / 0.22), rgb(var(--eb-accent) / 0) 70%)",
      }}
    />
  );
}

type HeroDecisionProps = {
  nextPeriodLabel: string;
  periodMonthOnlyLabel: string;
  amountLabel: string;
  selectedMode: CloseMonthCarryOverMode;
  onSelect: (mode: CloseMonthCarryOverMode) => void;
  t: <K extends keyof typeof closeMonthReviewModalDict.sv>(key: K) => string;
};

function HeroDecision({
  nextPeriodLabel,
  periodMonthOnlyLabel,
  amountLabel,
  selectedMode,
  onSelect,
  t,
}: HeroDecisionProps) {
  const groupLabelId = useId();

  return (
    <section aria-labelledby={groupLabelId} className="space-y-2">
      <h3 id={groupLabelId} className="sr-only">
        {t("surplusIntroLine1").replace("{amount}", amountLabel)}
      </h3>
      <div
        role="radiogroup"
        aria-labelledby={groupLabelId}
        className="grid gap-3 sm:grid-cols-2"
      >
        <HeroOption
          testId="resolve-carry-over"
          mode="full"
          selectedMode={selectedMode}
          onSelect={onSelect}
          kicker={t("optionCarryOverKicker")}
          title={t("optionCarryOverHeroTitle")
            .replace("{nextMonth}", nextPeriodLabel)
            .replace("{amount}", amountLabel)}
          body={t("optionCarryOverBody")}
          illo={<MoneyForwardIllo />}
          selectedLabel={t("optionSelected")}
        />
        <HeroOption
          testId="resolve-keep"
          mode="none"
          selectedMode={selectedMode}
          onSelect={onSelect}
          kicker={t("optionKeepKicker")}
          title={t("optionKeepHeroTitle").replace(
            "{monthOnly}",
            periodMonthOnlyLabel,
          )}
          body={t("optionKeepBody").replace(
            "{monthOnly}",
            periodMonthOnlyLabel,
          )}
          illo={<MoneyKeepIllo />}
          selectedLabel={t("optionSelected")}
        />
      </div>
    </section>
  );
}

type HeroOptionProps = {
  testId: string;
  mode: CloseMonthCarryOverMode;
  selectedMode: CloseMonthCarryOverMode;
  onSelect: (mode: CloseMonthCarryOverMode) => void;
  kicker: string;
  title: string;
  body: string;
  illo: React.ReactNode;
  selectedLabel: string;
};

function HeroOption({
  testId,
  mode,
  selectedMode,
  onSelect,
  kicker,
  title,
  body,
  illo,
  selectedLabel,
}: HeroOptionProps) {
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
        "group relative flex h-full flex-col gap-2.5 rounded-2xl border px-4 py-4 text-left",
        "transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out",
        "motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/35",
        selected
          ? cn(
              "border-eb-accent/55 bg-[linear-gradient(180deg,rgba(220,252,231,0.55),rgba(220,252,231,0.18))]",
              "shadow-[0_12px_28px_rgba(34,197,94,0.18)] -translate-y-px",
            )
          : "border-eb-stroke/25 bg-white/92 hover:border-eb-stroke/40 hover:bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.22em]",
              selected ? "text-eb-accent" : "text-eb-text/45",
            )}
          >
            {kicker}
          </span>
          <span className="block text-[15px] font-semibold tracking-tight text-eb-text">
            {title}
          </span>
        </div>
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            "transition-colors duration-200 ease-out motion-reduce:transition-none",
            selected
              ? "border-eb-accent bg-eb-accent text-white"
              : "border-eb-stroke/45 bg-white text-transparent",
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      </div>
      <p className="text-[13px] leading-[1.55] text-eb-text/65">{body}</p>
      <div className="mt-1 self-end text-eb-text/45">{illo}</div>
      <span className="sr-only">{selected ? selectedLabel : ""}</span>
    </button>
  );
}

function MoneyForwardIllo() {
  return (
    <svg
      width="38"
      height="20"
      viewBox="0 0 38 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="3" y1="10" x2="32" y2="10" />
      <polyline points="26 4 32 10 26 16" />
      <circle cx="3" cy="10" r="2.4" fill="currentColor" stroke="none" opacity="0.55" />
    </svg>
  );
}

function MoneyKeepIllo() {
  return (
    <svg
      width="38"
      height="20"
      viewBox="0 0 38 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="6" y="4" width="26" height="12" rx="3" />
      <circle cx="19" cy="10" r="2.5" fill="currentColor" stroke="none" opacity="0.55" />
    </svg>
  );
}

type StatStripProps = {
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
  emphasizeRemaining: boolean;
};

function StatStrip({
  labels,
  summary,
  currency,
  locale,
  remainingLabel,
  showIncomingCarryOver,
  emphasizeRemaining,
}: StatStripProps) {
  return (
    <section
      data-testid="close-month-summary"
      className={cn(
        "grid gap-3 rounded-2xl border border-eb-stroke/20 px-4 py-3 sm:px-5",
        "bg-[rgb(var(--eb-shell)/0.18)]",
        showIncomingCarryOver
          ? "grid-cols-2 md:grid-cols-5"
          : "grid-cols-2 md:grid-cols-4",
      )}
    >
      {showIncomingCarryOver ? (
        <HeroStat
          testId="close-month-summary-incoming-carry-over"
          label={labels.incomingCarryOver}
          value={formatAutoSigned(summary.incomingCarryOver, currency, locale)}
          tone={summary.incomingCarryOver < 0 ? "negative" : "neutral"}
        />
      ) : null}
      <HeroStat
        testId="close-month-summary-income"
        label={labels.income}
        value={formatSigned(summary.income, "+", currency, locale)}
        tone="positive"
      />
      <HeroStat
        testId="close-month-summary-expenses"
        label={labels.expenses}
        value={formatSigned(summary.expenses, "-", currency, locale)}
      />
      <HeroStat
        testId="close-month-summary-savings-debt"
        label={labels.savingsAndDebt}
        value={formatSigned(summary.savingsAndDebt, "-", currency, locale)}
      />
      <HeroStat
        testId="close-month-summary-remaining"
        label={labels.remaining}
        value={remainingLabel}
        tone={emphasizeRemaining ? "positive" : "neutral"}
        emphasized
      />
    </section>
  );
}

type HeroStatProps = {
  testId: string;
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  emphasized?: boolean;
};

function HeroStat({
  testId,
  label,
  value,
  tone = "neutral",
  emphasized = false,
}: HeroStatProps) {
  return (
    <div
      data-testid={testId}
      className="flex min-w-0 flex-col gap-0.5"
    >
      <span className="min-h-[1.5rem] text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-eb-text/55">
        {label}
      </span>
      <span
        className={cn(
          "whitespace-nowrap tabular-nums tracking-tight",
          emphasized ? "text-base font-bold" : "text-sm font-semibold",
          tone === "positive"
            ? "text-eb-accent"
            : tone === "negative"
              ? "text-rose-700"
              : "text-eb-text",
        )}
      >
        {value}
      </span>
    </div>
  );
}

type CompletionCandidatesSectionProps = {
  candidates: SavingsGoalCompletionCandidateDto[];
  selectedIds: ReadonlySet<string>;
  onToggle?: (goalId: string) => void;
  isSubmitting: boolean;
  currency: CurrencyCode;
  locale: string;
  t: <K extends keyof typeof closeMonthReviewModalDict.sv>(key: K) => string;
};

function CompletionCandidatesSection({
  candidates,
  selectedIds,
  onToggle,
  isSubmitting,
  currency,
  locale,
  t,
}: CompletionCandidatesSectionProps) {
  const sectionLabelId = useId();

  return (
    <section
      data-testid="close-month-completion-candidates"
      aria-labelledby={sectionLabelId}
      className="rounded-2xl border border-eb-stroke/15 bg-white/85 px-4 py-3 sm:px-5"
    >
      <header className="space-y-0.5">
        <h3
          id={sectionLabelId}
          className="text-sm font-semibold tracking-tight text-eb-text"
        >
          {t("completionCandidatesTitle")}
        </h3>
        <p className="text-xs leading-5 text-eb-text/55">
          {t("completionCandidatesHelper")}
        </p>
      </header>
      <ul className="mt-3 space-y-2">
        {candidates.map((candidate) => (
          <CompletionCandidateRow
            key={candidate.id}
            candidate={candidate}
            isChecked={selectedIds.has(candidate.id)}
            onToggle={onToggle}
            isSubmitting={isSubmitting}
            currency={currency}
            locale={locale}
            t={t}
          />
        ))}
      </ul>
    </section>
  );
}

type CompletionCandidateRowProps = {
  candidate: SavingsGoalCompletionCandidateDto;
  isChecked: boolean;
  onToggle?: (goalId: string) => void;
  isSubmitting: boolean;
  currency: CurrencyCode;
  locale: string;
  t: <K extends keyof typeof closeMonthReviewModalDict.sv>(key: K) => string;
};

function CompletionCandidateRow({
  candidate,
  isChecked,
  onToggle,
  isSubmitting,
  currency,
  locale,
  t,
}: CompletionCandidateRowProps) {
  const name =
    candidate.name?.trim() || t("completionCandidateGoalFallback");
  const progressRatio =
    candidate.targetAmount > 0
      ? Math.min(1, candidate.projectedAmountSaved / candidate.targetAmount)
      : 1;
  const progressPercent = Math.round(progressRatio * 100);
  const progressLabel = t("completionCandidateProgressLabel").replace(
    "{percent}",
    String(progressPercent),
  );
  const reachedLabel = formatMoneyV2(
    candidate.projectedAmountSaved,
    currency,
    locale,
  );
  const targetLabel = formatMoneyV2(
    candidate.targetAmount,
    currency,
    locale,
  );
  const checkboxAriaLabel = t("completionCandidateCheckboxLabel").replace(
    "{name}",
    name,
  );

  return (
    <li
      data-testid={`close-month-completion-candidate-${candidate.id}`}
      className={cn(
        "rounded-xl border border-eb-stroke/15 bg-white/95 px-3 py-2.5 transition-colors",
        isChecked ? "border-emerald-400/45 bg-emerald-500/[0.04]" : null,
      )}
    >
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isChecked}
          disabled={isSubmitting}
          onChange={() => onToggle?.(candidate.id)}
          aria-label={checkboxAriaLabel}
          data-testid={`close-month-completion-checkbox-${candidate.id}`}
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 rounded border-eb-stroke/35 text-eb-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/35",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="truncate text-sm font-semibold tracking-tight text-eb-text">
              {name}
            </span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-eb-text/70">
              {reachedLabel} / {targetLabel}
            </span>
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-eb-text/55">
            {t("completionCandidateRowHint")}
          </span>
          <span
            role="progressbar"
            aria-label={progressLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-eb-shell/55"
          >
            <span
              aria-hidden
              className="block h-full rounded-full bg-emerald-500/80"
              style={{ width: `${progressPercent}%` }}
            />
          </span>
        </span>
      </label>
    </li>
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
