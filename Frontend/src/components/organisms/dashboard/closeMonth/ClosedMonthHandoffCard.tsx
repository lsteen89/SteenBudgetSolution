import RichBird from "@assets/Images/RichBird.png";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { YearChapterStrip } from "@/components/atoms/dashboard/YearChapterStrip";
import SoftConfetti from "@/components/atoms/decor/SoftConfetti";
import { useCountUp } from "@/hooks/animation/useCountUp";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import useDisableScroll from "@/hooks/useDisableScroll";
import { cn } from "@/lib/utils";
import type { CloseMonthCarryOverMode } from "@/hooks/dashboard/closeMonth.types";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { closedMonthHandoffCardDict } from "@/utils/i18n/pages/private/dashboard/closeMonth/ClosedMonthHandoffCard.i18n";
import FocusTrap from "focus-trap-react";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export type ClosedMonthHandoffCardProps = {
  closedMonthLabel: string;
  /** Month-only label of the closed month, e.g. "April" — used for the
   * stay link and the income/expenses panel kickers. */
  closedMonthOnlyLabel: string;
  /** Four-digit year of the closed month as a string, used on the
   * stamp + year card. */
  closedYearLabel: string;
  nextMonthLabel: string;
  finalBalance: number;
  carryOverMode: CloseMonthCarryOverMode;
  carryOverAmount: number;
  /** Closed-month income total — drives the first number panel. */
  monthlyIncome: number;
  /** Closed-month expense total — drives the second number panel. */
  monthlyExpenses: number;
  /** Count of already-closed months for the closing year (does not
   * include the just-closed month). Used to label the year card and
   * highlight the just-closed pill on the strip. */
  closedMonthsInYear: number;
  /** The twelve `YYYY-MM` strings for the closing year. */
  yearMonthList: readonly string[];
  currency: CurrencyCode;
  onContinue: () => void;
  /** Called when the user dismisses via ESC, top-right X, the stay
   * link, or any other dismiss path. Required for the takeover — the
   * full-screen overlay must always have a way out. */
  onDismiss: () => void;
};

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

type DictKey = keyof typeof closedMonthHandoffCardDict.sv;

export default function ClosedMonthHandoffCard(
  props: ClosedMonthHandoffCardProps,
) {
  // The takeover is rendered into document.body so it overlays every
  // dashboard chrome. Guarding `typeof document` keeps this safe under
  // any future SSR pass.
  if (typeof document === "undefined") return null;
  return createPortal(
    <ClosedMonthHandoffTakeover {...props} />,
    document.body,
  );
}

function ClosedMonthHandoffTakeover({
  closedMonthLabel,
  closedMonthOnlyLabel,
  closedYearLabel,
  nextMonthLabel,
  finalBalance,
  carryOverMode,
  carryOverAmount,
  monthlyIncome,
  monthlyExpenses,
  closedMonthsInYear,
  yearMonthList,
  currency,
  onContinue,
  onDismiss,
}: ClosedMonthHandoffCardProps) {
  const locale = useAppLocale();
  // Reduced motion drives three things in this surface: the count-up on
  // every number panel (snap to target), the SoftConfetti burst (render
  // nothing), and the CSS entrance/stamp/mascot classes (omitted from
  // the className so the `@media (prefers-reduced-motion)` gate in
  // index.css never matters because the class is not on the element).
  const prefersReducedMotion = useReducedMotion() ?? false;
  const t = <K extends DictKey>(key: K) =>
    tDict(key, locale, closedMonthHandoffCardDict);

  const variant = resolveVariant(finalBalance, carryOverMode);
  const isDeficit = variant === "deficit";

  // Pick the amount that should drive the count-up on the third panel.
  // - positiveFull: amount carried to next month
  // - positiveKept: surplus that stayed in the closing month
  // - balanced/deficit: no third number
  const surplusForPanel =
    variant === "positiveFull"
      ? Math.max(carryOverAmount, 0)
      : variant === "positiveKept"
        ? Math.max(finalBalance, 0)
        : 0;

  // Subhead amount mirrors the panel surplus for the positive paths so
  // both surfaces tell the same story. Negative numbers are formatted
  // with an explicit leading minus rather than the i18n auto-sign so the
  // copy stays calm ("ended at -750 kr").
  const subheadAmount =
    variant === "positiveFull"
      ? formatMoneyV2(surplusForPanel, currency, locale)
      : variant === "positiveKept"
        ? formatMoneyV2(surplusForPanel, currency, locale)
        : isDeficit
          ? `-${formatMoneyV2(Math.abs(finalBalance), currency, locale)}`
          : "";

  const animationEnabled = !prefersReducedMotion;
  const animatedIncome = useCountUp(monthlyIncome, 1200, animationEnabled);
  const animatedExpenses = useCountUp(monthlyExpenses, 1200, animationEnabled);
  const animatedSurplus = useCountUp(surplusForPanel, 1100, animationEnabled);

  const tokens = {
    month: closedMonthLabel,
    monthOnly: closedMonthOnlyLabel,
    year: closedYearLabel,
    nextMonth: nextMonthLabel,
    amount: subheadAmount,
    // `closedMonthsInYear` is read off `archiveMonths` in
    // DashboardContent, which already reflects the post-close state
    // (the just-closed month is "closed"). So it doubles as the
    // {closed} token for the year-progress copy without a +1.
    closed: String(closedMonthsInYear),
  };

  const headline = replaceTokens(t("headline"), tokens);
  const kicker = t("kicker");
  const subhead = (() => {
    switch (variant) {
      case "positiveFull":
      case "positiveKept":
        return replaceTokens(t("subheadPositive"), tokens);
      case "balanced":
        return replaceTokens(t("subheadBalanced"), tokens);
      case "deficit":
        return replaceTokens(t("subheadDeficit"), tokens);
    }
  })();
  const continueLabel = replaceTokens(t("continueTakeover"), tokens);
  const stayLabel = replaceTokens(t("stayLink"), tokens);
  const readOnlyNote = replaceTokens(t("readOnlyNote"), tokens);
  const yearLabel = replaceTokens(t("yearLabel"), tokens);
  // For the year-progress count, the just-closed month bumps the closed
  // count by one — except for the deficit / balanced paths where the
  // close is still recorded but no surplus moved (we still count it as
  // closed). Brief: "just-closed dot landing green" for every variant.
  const yearProgress = replaceTokens(t("yearProgress"), tokens);
  const closeAria = t("closeButtonAria");

  const summaryAria = (() => {
    switch (variant) {
      case "positiveFull":
        return replaceTokens(t("summaryAriaPositive"), tokens);
      case "positiveKept":
        return replaceTokens(t("summaryAriaKept"), tokens);
      case "balanced":
        return replaceTokens(t("summaryAriaBalanced"), tokens);
      case "deficit":
        return replaceTokens(t("summaryAriaDeficit"), tokens);
    }
  })();

  const headlineId = useId();

  // Lock body scroll while the takeover is mounted.
  useDisableScroll(true);

  // ESC closes the takeover. Listening on the window keeps the handler
  // alive even if focus is on the body before the focus-trap claims it.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onDismiss();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  // Restore focus to whatever held it before the takeover painted (the
  // close-month confirm button, in practice).
  const previouslyFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previouslyFocused.current =
      (document.activeElement as HTMLElement | null) ?? null;
    return () => {
      if (
        previouslyFocused.current &&
        typeof previouslyFocused.current.focus === "function"
      ) {
        previouslyFocused.current.focus();
      }
    };
  }, []);

  const confettiPalette = isDeficit ? "muted" : "brand";
  const confettiPieces = isDeficit ? 12 : 48;

  // The income / expenses / surplus values land in number panels with a
  // count-up; deficits keep the third panel neutral and copy says
  // "Inget överskott den här månaden" / "No surplus this month".
  const incomeLabel = formatMoneyV2(animatedIncome, currency, locale, {
    fractionDigits: 0,
  });
  const expensesLabel = formatMoneyV2(animatedExpenses, currency, locale, {
    fractionDigits: 0,
  });
  const surplusLabel = formatMoneyV2(animatedSurplus, currency, locale);
  const settledIncomeLabel = formatMoneyV2(monthlyIncome, currency, locale, {
    fractionDigits: 0,
  });
  const settledExpensesLabel = formatMoneyV2(monthlyExpenses, currency, locale, {
    fractionDigits: 0,
  });
  const settledSurplusLabel = formatMoneyV2(surplusForPanel, currency, locale);

  return (
    <FocusTrap
      active
      focusTrapOptions={{
        // The X is the most predictable initial focus — calm dismiss
        // path, top-right, escapable with one tab.
        initialFocus: '[data-testid="closed-month-handoff-dismiss"]',
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        returnFocusOnDeactivate: false,
        // jsdom has no layout, so the tabbable library's default
        // display check rejects every node as untabbable and the trap
        // refuses to mount. Skipping the display check keeps the trap
        // honest in real browsers and silent under test.
        tabbableOptions: { displayCheck: "none" },
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headlineId}
        data-testid="closed-month-handoff-card"
        data-variant={variant}
        data-reduce-motion={prefersReducedMotion ? "true" : undefined}
        className={cn(
          "fixed inset-0 z-50 isolate overflow-y-auto",
          "bg-[radial-gradient(120%_80%_at_50%_-10%,rgb(220,252,231)_0%,rgb(239,246,255)_35%,rgb(219,234,254)_100%)]",
        )}
      >
        <DecorBlobs />

        <SoftConfetti
          pieces={confettiPieces}
          palette={confettiPalette}
        />

        <button
          type="button"
          aria-label={closeAria}
          data-testid="closed-month-handoff-dismiss"
          onClick={onDismiss}
          className={cn(
            "absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center",
            "rounded-full border border-eb-stroke/40 bg-eb-surface/75 text-eb-text/60",
            "backdrop-blur transition-colors duration-150 ease-out motion-reduce:transition-none",
            "hover:bg-eb-surface hover:text-eb-text",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/35",
          )}
        >
          <X aria-hidden className="h-4 w-4" strokeWidth={2} />
        </button>

        <span className="sr-only" aria-live="polite">
          {summaryAria}
        </span>

        <div
          className={cn(
            "relative mx-auto flex max-w-[64rem] flex-col items-center gap-6 px-6 py-12 text-center",
            "sm:px-14 sm:py-14",
            prefersReducedMotion ? null : "cm-fade-up",
          )}
        >
          <p
            data-testid="closed-month-handoff-kicker"
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.22em]",
              isDeficit ? "text-eb-text/60" : "text-eb-accent",
            )}
          >
            {kicker}
          </p>

          <h1
            id={headlineId}
            data-testid="closed-month-handoff-title"
            className="max-w-3xl text-[2rem] font-extrabold leading-[1.1] tracking-tight text-eb-text sm:text-[2.75rem]"
          >
            {headline}
          </h1>

          <p
            data-testid="closed-month-handoff-body"
            className="max-w-[36rem] text-sm leading-[1.65] text-eb-text/70 sm:text-base"
          >
            {subhead}
          </p>

          <div className="mt-2 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <img
              src={RichBird}
              alt=""
              aria-hidden
              className={cn(
                "h-28 w-28 select-none object-contain drop-shadow-[0_18px_30px_rgba(21,39,81,0.18)] sm:h-32 sm:w-32",
                prefersReducedMotion ? null : "cm-mascot-hello",
              )}
            />
            <Stamp
              monthLabel={closedMonthOnlyLabel}
              yearLabel={closedYearLabel}
              label={t("stampLabel")}
              savedSuffix={isDeficit ? "" : t("stampSavedSuffix")}
              isDeficit={isDeficit}
              prefersReducedMotion={prefersReducedMotion}
            />
          </div>

          <YearCard
            yearLabel={yearLabel}
            yearProgress={yearProgress}
            // Zero-based index of the just-closed month. `archiveMonths`
            // already counts it, so subtract one to point the highlight
            // pill at the right column.
            closedThrough={Math.max(0, closedMonthsInYear - 1)}
            yearMonthList={yearMonthList}
            locale={locale}
          />

          <NumberPanels
            incomeLabel={incomeLabel}
            settledIncomeLabel={settledIncomeLabel}
            incomeKicker={replaceTokens(t("panelIncome"), tokens)}
            expensesLabel={`−${expensesLabel}`}
            settledExpensesLabel={`−${settledExpensesLabel}`}
            expensesKicker={replaceTokens(t("panelExpenses"), tokens)}
            thirdPanel={(() => {
              if (variant === "positiveFull") {
                return {
                  kicker: replaceTokens(t("panelCarriedOver"), tokens),
                  value: `+${surplusLabel}`,
                  settledValue: `+${settledSurplusLabel}`,
                  tone: "positive",
                };
              }
              if (variant === "positiveKept") {
                return {
                  kicker: replaceTokens(t("panelKept"), tokens),
                  value: `+${surplusLabel}`,
                  settledValue: `+${settledSurplusLabel}`,
                  tone: "positive",
                };
              }
              return {
                kicker: t("panelNoSurplus"),
                value: "",
                settledValue: "",
                tone: "neutral",
              };
            })()}
          />

          <div className="mt-2 flex flex-col items-center gap-3">
            <CtaButton
              type="button"
              data-testid="closed-month-handoff-continue"
              onClick={onContinue}
              className="h-[52px] px-7 text-base"
            >
              <span>{continueLabel}</span>
              <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            </CtaButton>
            <button
              type="button"
              data-testid="closed-month-handoff-stay"
              onClick={onDismiss}
              className={cn(
                "rounded-md bg-transparent text-[13px] text-eb-text/55 underline decoration-eb-text/25 underline-offset-[6px]",
                "transition-colors duration-150 hover:text-eb-text/80 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/35",
              )}
            >
              {stayLabel}
            </button>
          </div>

          <p
            data-testid="closed-month-handoff-read-only-note"
            className="mt-2 max-w-[34rem] text-xs leading-5 text-eb-text/45"
          >
            {readOnlyNote}
          </p>
        </div>
      </div>
    </FocusTrap>
  );
}

// Three soft radial blobs at the top — same idiom as the design's
// CmDecorBlobs, ported as a tiny CSS-only component.
function DecorBlobs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-60 overflow-hidden"
    >
      <span className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-eb-shell/45 blur-[40px]" />
      <span className="absolute -top-24 left-[10%] h-56 w-56 rounded-full bg-eb-shell/30 blur-[40px]" />
      <span className="absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-eb-shell/30 blur-[40px]" />
    </div>
  );
}

type StampProps = {
  monthLabel: string;
  yearLabel: string;
  label: string;
  savedSuffix: string;
  isDeficit: boolean;
  prefersReducedMotion: boolean;
};

function Stamp({
  monthLabel,
  yearLabel,
  label,
  savedSuffix,
  isDeficit,
  prefersReducedMotion,
}: StampProps) {
  return (
    <div
      data-testid="closed-month-handoff-stamp"
      data-deficit={isDeficit ? "true" : undefined}
      className={cn(
        "relative min-w-[12rem] rounded-2xl px-7 pb-5 pt-4 text-center",
        "border-2 shadow-[0_18px_40px_rgba(34,197,94,0.18),inset_0_1px_0_rgba(255,255,255,0.85)]",
        "backdrop-blur-[2px]",
        isDeficit
          ? "border-eb-stroke/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.65))]"
          : "border-eb-accent/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(220,252,231,0.65))]",
        prefersReducedMotion ? null : "cm-stamp",
      )}
      // The visible rotation lives in CSS so reduced-motion can hold the
      // final tilt without a settle animation.
      style={prefersReducedMotion ? { transform: "rotate(-7deg)" } : undefined}
    >
      <div
        data-testid="closed-month-handoff-stamp-label"
        className={cn(
          "mb-1 text-[10px] font-extrabold uppercase tracking-[0.32em]",
          isDeficit ? "text-eb-text/60" : "text-eb-accent",
        )}
      >
        {label}
        {savedSuffix}
      </div>
      <div className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-eb-text">
        {monthLabel}
      </div>
      <div className="text-sm font-bold tracking-[0.12em] text-eb-text/55">
        {yearLabel}
      </div>
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <span
          key={corner}
          aria-hidden
          className={cn(
            "absolute h-1.5 w-1.5 rounded-full bg-eb-accent/40",
            corner === "tl" && "left-2 top-2",
            corner === "tr" && "right-2 top-2",
            corner === "bl" && "bottom-2 left-2",
            corner === "br" && "bottom-2 right-2",
          )}
        />
      ))}
    </div>
  );
}

type YearCardProps = {
  yearLabel: string;
  yearProgress: string;
  closedThrough: number;
  yearMonthList: readonly string[];
  locale: string;
};

function YearCard({
  yearLabel,
  yearProgress,
  closedThrough,
  yearMonthList,
  locale,
}: YearCardProps) {
  return (
    <section
      data-testid="closed-month-handoff-year-card"
      className={cn(
        "w-full max-w-[44rem] rounded-3xl border border-eb-stroke/40 bg-eb-surface/80 px-6 py-5 sm:px-8 sm:py-6",
        "shadow-[0_18px_50px_rgba(21,39,81,0.10),inset_0_1px_0_rgba(255,255,255,0.6)]",
        "backdrop-blur-[4px]",
      )}
    >
      <header className="mb-4 flex items-center justify-between gap-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-eb-text/55">
          {yearLabel}
        </span>
        <span
          data-testid="closed-month-handoff-year-progress"
          className="text-xs font-medium text-eb-text/55"
        >
          {yearProgress}
        </span>
      </header>
      <YearChapterStrip
        closedThrough={closedThrough}
        yearMonthList={yearMonthList}
        locale={locale}
        highlight
        size="md"
      />
    </section>
  );
}

type NumberPanelsProps = {
  incomeKicker: string;
  incomeLabel: string;
  settledIncomeLabel: string;
  expensesKicker: string;
  expensesLabel: string;
  settledExpensesLabel: string;
  thirdPanel: {
    kicker: string;
    value: string;
    settledValue: string;
    tone: "positive" | "neutral";
  };
};

function NumberPanels({
  incomeKicker,
  incomeLabel,
  settledIncomeLabel,
  expensesKicker,
  expensesLabel,
  settledExpensesLabel,
  thirdPanel,
}: NumberPanelsProps) {
  return (
    <div className="grid w-full max-w-[44rem] grid-cols-1 gap-3 sm:grid-cols-3">
      <NumberPanel
        testId="closed-month-handoff-panel-income"
        kicker={incomeKicker}
        value={incomeLabel}
        settledValue={settledIncomeLabel}
        tone="neutral"
      />
      <NumberPanel
        testId="closed-month-handoff-panel-expenses"
        kicker={expensesKicker}
        value={expensesLabel}
        settledValue={settledExpensesLabel}
        tone="neutral"
      />
      <NumberPanel
        testId="closed-month-handoff-panel-surplus"
        kicker={thirdPanel.kicker}
        value={thirdPanel.value}
        settledValue={thirdPanel.settledValue}
        tone={thirdPanel.tone}
      />
    </div>
  );
}

type NumberPanelProps = {
  testId: string;
  kicker: string;
  value: string;
  settledValue: string;
  tone: "positive" | "neutral";
};

function NumberPanel({
  testId,
  kicker,
  value,
  settledValue,
  tone,
}: NumberPanelProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "rounded-2xl border border-eb-stroke/40 bg-eb-surface/85 px-5 py-4 text-left",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-[2px]",
      )}
    >
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-eb-text/55">
        {kicker}
      </p>
      <p
        className={cn(
          "tabular-nums text-[1.4rem] font-extrabold leading-tight tracking-tight",
          tone === "positive" ? "text-eb-accent" : "text-eb-text",
        )}
        aria-label={settledValue || undefined}
      >
        {value || " "}
      </p>
    </div>
  );
}

