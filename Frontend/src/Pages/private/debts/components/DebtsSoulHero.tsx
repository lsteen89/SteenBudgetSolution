import BudgetEditorHeroShell from "@/components/molecules/forms/budgetEditor/BudgetEditorHeroShell";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type {
  DebtEditorRowDto,
  DebtEditorSummaryDto,
} from "@/types/budget/DebtEditorDto";
import { debtsEditorPageDict } from "@/utils/i18n/pages/private/debts/DebtsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import {
  DEBT_TYPE_BUCKET_ORDER,
  splitDebtRowsBy,
  type DebtTypeBucket,
} from "../utils/debtTypeSplit";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

type DebtsSoulHeroProps = {
  /** Display label for the open month (`maj 2026`). */
  yearMonthLabel: string;
  /** Summary block from the PR 5 read model. */
  summary: DebtEditorSummaryDto;
  /**
   * Active-group rows. Used to compute the per-type split on the hero so the
   * subtitle line stays honest to the IncludedMonthlyPaymentTotal.
   */
  activeRows: readonly DebtEditorRowDto[];
  /**
   * `Kvar i budget` figure from the dashboard query. The hero never
   * recomputes the equation — the pill shows backend-derived remaining-money
   * for the same month.
   */
  remainingInBudget: number | null;
  /** True when the month is closed/skipped. Hides the CTA and shows the pill. */
  readOnly: boolean;
  /**
   * Debt PR 7 — opens the add-debt drawer. When omitted, the CTA renders
   * disabled (the PR 6 placeholder behavior) so the hero remains usable
   * during the PR 7 transition and inside tests that don't wire the add
   * flow.
   */
  onAddDebt?: () => void;
};

const interpolate = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");

export default function DebtsSoulHero({
  yearMonthLabel,
  summary,
  activeRows,
  remainingInBudget,
  readOnly,
  onAddDebt,
}: DebtsSoulHeroProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof debtsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, debtsEditorPageDict);

  const totalPlanned = summary.includedMonthlyPaymentTotal;
  const isEmpty = totalPlanned === 0 && activeRows.length === 0;

  const totalPlannedText = formatMoneyV2(totalPlanned, currency, locale, {
    fractionDigits: 0,
  });
  const owedBalanceText = formatMoneyV2(
    summary.activeLiabilityBalanceTotal,
    currency,
    locale,
    { fractionDigits: 0 },
  );

  // Per-type split of included planned payments — only for the active group
  // because the hero subtitle states "denna månad" / "this month".
  const split = splitDebtRowsBy(activeRows, (row) => row.monthlyPayment);

  return (
    <BudgetEditorHeroShell
      testId="debts-soul-hero"
      mascotTestId="debts-hero-mascot"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-eb-text/50">
        {interpolate(t("heroEyebrow"), { yearMonthLabel })}
      </p>

      <h1
        data-testid="debts-hero-headline"
        className="mt-2 text-[1.75rem] font-extrabold leading-tight tracking-tight text-eb-text sm:text-[2rem]"
      >
        {isEmpty
          ? t("heroHeadlineEmpty")
          : renderHeadline(t("heroHeadline"), totalPlannedText)}
      </h1>

      {!isEmpty ? (
        <p
          data-testid="debts-hero-split"
          className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-sm text-eb-text/65 sm:text-[15px]"
        >
          <SplitPart
            bucket="loan"
            value={split.loan}
            currency={currency}
            locale={locale}
            template={t("heroSplitLoan")}
            testId="debts-hero-split-loan"
            includeLeadingDot={false}
          />
          <SplitPart
            bucket="credit"
            value={split.credit}
            currency={currency}
            locale={locale}
            template={t("heroSplitCredit")}
            testId="debts-hero-split-credit"
            includeLeadingDot={hasVisibleAbove("credit", split)}
          />
          <SplitPart
            bucket="installment"
            value={split.installment}
            currency={currency}
            locale={locale}
            template={t("heroSplitInstallment")}
            testId="debts-hero-split-installment"
            includeLeadingDot={hasVisibleAbove("installment", split)}
          />
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          data-testid="debts-hero-snapshot-pill"
          className="inline-flex items-center gap-2 rounded-full border border-eb-stroke/22 bg-[rgb(var(--eb-shell-3)/0.05)] px-3 py-1.5 text-[13px] font-semibold text-eb-text/80"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-eb-text/55">
            {t("heroSnapshotLabel")}
          </span>
          <strong className="tabular-nums">{owedBalanceText}</strong>
        </span>

        {remainingInBudget !== null ? (
          // MVP cleanup: negative remaining-money now uses the established
          // amber warning treatment (same border / fill / text as the
          // read-only banner and shortfall advisory) and switches the copy to
          // "{abs amount} saknas i budgeten" so the meaning is obvious. The
          // positive case keeps the calm neutral pill it always had.
          remainingInBudget < 0 ? (
            <span
              data-testid="debts-hero-budget-pill"
              data-tone="warn"
              className="inline-flex items-center gap-2 rounded-full border border-eb-warning/35 bg-[rgb(217_119_6_/0.10)] px-3 py-1.5 text-[13px] font-semibold text-[#7c4a03]"
            >
              <strong className="tabular-nums">
                {formatMoneyV2(Math.abs(remainingInBudget), currency, locale, {
                  fractionDigits: 0,
                })}
              </strong>
              <span>{stripAmountToken(t("heroBudgetShortfall"))}</span>
            </span>
          ) : (
            <span
              data-testid="debts-hero-budget-pill"
              data-tone="positive"
              className="inline-flex items-center gap-2 rounded-full border border-eb-stroke/35 bg-eb-surface/70 px-3 py-1.5 text-[13px] font-semibold text-eb-text/72"
            >
              <strong className="text-[#166534] tabular-nums">
                {formatMoneyV2(remainingInBudget, currency, locale, {
                  fractionDigits: 0,
                })}
              </strong>
              <span>{stripAmountToken(t("heroBudgetRemaining"))}</span>
            </span>
          )
        ) : null}

        {readOnly ? (
          <span
            data-testid="debts-hero-read-only-pill"
            className="inline-flex items-center gap-2 rounded-full border border-eb-warning/30 bg-[rgb(217_119_6_/0.08)] px-3 py-1.5 text-[13px] font-semibold text-[#7c4a03]"
          >
            {interpolate(t("heroReadOnlyPill"), { yearMonthLabel })}
          </span>
        ) : null}
      </div>

      {!readOnly ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* PR 7 wires the add-debt drawer against the existing PR 2 POST
            endpoint. When no `onAddDebt` is wired (older callers / tests),
            the CTA falls back to the PR 6 disabled placeholder so the
            visual structure stays honest. */}
          {onAddDebt ? (
            <button
              type="button"
              onClick={onAddDebt}
              data-testid="debts-hero-add"
              className={[
                "inline-flex items-center gap-2 rounded-full",
                "bg-eb-accent px-5 py-2.5 text-sm font-semibold text-white",
                "shadow-eb transition hover:brightness-105",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/30",
              ].join(" ")}
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              {t("heroCta")}
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              title={t("heroCtaPendingPr")}
              data-testid="debts-hero-add"
              data-pending-pr="PR-07"
              className={[
                "inline-flex items-center gap-2 rounded-full",
                "bg-eb-accent/45 px-5 py-2.5 text-sm font-semibold text-white/85",
                "shadow-eb",
                "cursor-not-allowed",
              ].join(" ")}
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              {t("heroCta")}
            </button>
          )}
        </div>
      ) : null}
    </BudgetEditorHeroShell>
  );
}

function renderHeadline(template: string, amount: string): ReactNode {
  // Replace `{amount}` with a stronger-emphasised span. We keep the rest of
  // the sentence as plain text so the i18n translator controls word order.
  const [before, after] = template.split("{amount}");
  return (
    <>
      {before}
      <span className="text-eb-shell-3">{amount}</span>
      {after}
    </>
  );
}

/**
 * Strip the `{amount}` placeholder from the start of a template so the strong
 * value tag can be rendered separately. Keeps the rest of the string
 * (separator + label) for translator-controlled word order.
 */
function stripAmountToken(template: string): string {
  return template.replace(/^\s*\{amount\}\s*/, "");
}

function hasVisibleAbove(
  bucket: DebtTypeBucket,
  split: Record<DebtTypeBucket, number>,
): boolean {
  for (const candidate of DEBT_TYPE_BUCKET_ORDER) {
    if (candidate === bucket) return false;
    if (split[candidate] > 0) return true;
  }
  return false;
}

function SplitPart({
  bucket,
  value,
  template,
  currency,
  locale,
  testId,
  includeLeadingDot,
}: {
  bucket: DebtTypeBucket;
  value: number;
  template: string;
  currency: ReturnType<typeof useAppCurrency>;
  locale: ReturnType<typeof useAppLocale>;
  testId: string;
  includeLeadingDot: boolean;
}) {
  if (value <= 0) return null;
  const amount = formatMoneyV2(value, currency, locale, { fractionDigits: 0 });
  return (
    <>
      {includeLeadingDot ? <SplitDot /> : null}
      <span
        data-testid={testId}
        data-bucket={bucket}
        className="inline-flex items-baseline gap-1.5"
      >
        <strong className="font-extrabold tabular-nums text-eb-text">
          {amount}
        </strong>
        <span>{template.replace("{amount}", "").trim()}</span>
      </span>
    </>
  );
}

function SplitDot() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-1 w-1 self-center rounded-full bg-eb-text/30"
    />
  );
}
