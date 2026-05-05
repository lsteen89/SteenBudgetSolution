import { cn } from "@/lib/utils";
import { closedMonthRecapDict } from "@/utils/i18n/pages/private/dashboard/recap/ClosedMonthRecapSection.i18n";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import {
  ArrowRightLeft,
  ChevronDown,
  Landmark,
  PiggyBank,
  ReceiptText,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type RecapTKey = keyof typeof closedMonthRecapDict.sv;
type RecapT = <K extends RecapTKey>(key: K) => string;
type EmphasisTone = "neutral" | "positive" | "attention" | "balanced";

type ClosedMonthHeroMobileFlowProps = {
  carryOverAmount: number;
  incomeAmount: number;
  availableAmount: number;
  expenseAmount: number;
  savingsAmount: number;
  debtPaymentAmount: number;
  finalBalanceAmount: number;
  currency: CurrencyCode;
  locale: string;
  t: RecapT;
};

function resultTone(finalBalance: number): EmphasisTone {
  if (finalBalance > 0) return "positive";
  if (finalBalance < 0) return "attention";
  return "balanced";
}

function emphasisCardClasses(tone: EmphasisTone) {
  if (tone === "positive") {
    return "border-emerald-200/85 bg-emerald-50/80 ring-1 ring-emerald-100/85";
  }

  if (tone === "attention") {
    return "border-rose-200/80 bg-rose-50/80 ring-1 ring-rose-100/80";
  }

  if (tone === "balanced") {
    return "border-[rgb(199_228_255_/_0.7)] bg-eb-accentSoft/24 ring-1 ring-eb-accentSoft/45";
  }

  return "border-[rgb(199_228_255_/_0.65)] bg-[rgb(238_247_255_/_0.78)] ring-1 ring-[rgb(199_228_255_/_0.5)]";
}

function emphasisAmountClasses(tone: EmphasisTone) {
  if (tone === "positive") return "text-emerald-800";
  if (tone === "attention") return "text-rose-700";
  return "text-eb-text";
}

function emphasisEyebrowClasses(tone: EmphasisTone) {
  if (tone === "positive") return "text-emerald-700";
  if (tone === "attention") return "text-rose-700";
  if (tone === "balanced") return "text-eb-accent";
  return "text-eb-accent";
}

function FlowRow({
  Icon,
  label,
  amount,
  currency,
  locale,
}: {
  Icon: LucideIcon;
  label: string;
  amount: number;
  currency: CurrencyCode;
  locale: string;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-eb-shell/70 text-eb-text/55">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 truncate text-sm font-bold leading-5 text-eb-text/74">
        {label}
      </span>
      <span className="shrink-0 text-right text-sm font-extrabold leading-5 tabular-nums text-eb-text">
        {formatMoneyV2(amount, currency, locale)}
      </span>
    </div>
  );
}

function GroupCard({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-eb-stroke/22 bg-white/86 px-4 py-1 shadow-[0_10px_28px_rgb(21_39_81_/_0.05)] backdrop-blur">
      {eyebrow ? (
        <p className="px-px pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-eb-text/48">
          {eyebrow}
        </p>
      ) : null}
      <div className="divide-y divide-eb-stroke/16">{children}</div>
    </div>
  );
}

function EmphasisCard({
  eyebrow,
  label,
  amount,
  currency,
  locale,
  tone,
}: {
  eyebrow: string;
  label: string;
  amount: number;
  currency: CurrencyCode;
  locale: string;
  tone: EmphasisTone;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3.5 shadow-[0_14px_36px_rgb(21_39_81_/_0.06)]",
        emphasisCardClasses(tone),
      )}
    >
      <p
        className={cn(
          "text-[11px] font-bold uppercase tracking-[0.1em]",
          emphasisEyebrowClasses(tone),
        )}
      >
        {eyebrow}
      </p>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold leading-5 text-eb-text/72">
          {label}
        </span>
        <span
          className={cn(
            "text-2xl font-extrabold leading-7 tabular-nums",
            emphasisAmountClasses(tone),
          )}
        >
          {formatMoneyV2(amount, currency, locale)}
        </span>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div
      aria-hidden="true"
      className="relative flex items-center justify-center py-0.5"
    >
      <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(199,228,255,0.0),rgba(60,97,117,0.28),rgba(199,228,255,0.0))]" />
      <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(199_228_255_/_0.7)] bg-white/95 text-eb-accent shadow-[0_6px_14px_rgb(21_39_81_/_0.07)]">
        <ChevronDown className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

export default function ClosedMonthHeroMobileFlow({
  carryOverAmount,
  incomeAmount,
  availableAmount,
  expenseAmount,
  savingsAmount,
  debtPaymentAmount,
  finalBalanceAmount,
  currency,
  locale,
  t,
}: ClosedMonthHeroMobileFlowProps) {
  return (
    <div
      data-testid="closed-month-hero-mobile-flow"
      className="grid gap-2 lg:hidden"
    >
      <GroupCard eyebrow={t("heroFlowStartGroup")}>
        <FlowRow
          Icon={ArrowRightLeft}
          label={t("flowCarryOverLabel")}
          amount={carryOverAmount}
          currency={currency}
          locale={locale}
        />
        <FlowRow
          Icon={WalletCards}
          label={t("income")}
          amount={incomeAmount}
          currency={currency}
          locale={locale}
        />
      </GroupCard>

      <Connector />

      <EmphasisCard
        eyebrow={t("heroAvailableShort")}
        label={t("heroAvailableShort")}
        amount={availableAmount}
        currency={currency}
        locale={locale}
        tone="balanced"
      />

      <Connector />

      <GroupCard eyebrow={t("chartFlowMovement")}>
        <FlowRow
          Icon={ReceiptText}
          label={t("expenses")}
          amount={expenseAmount}
          currency={currency}
          locale={locale}
        />
        <FlowRow
          Icon={PiggyBank}
          label={t("savings")}
          amount={savingsAmount}
          currency={currency}
          locale={locale}
        />
        <FlowRow
          Icon={Landmark}
          label={t("heroDebtShort")}
          amount={debtPaymentAmount}
          currency={currency}
          locale={locale}
        />
      </GroupCard>

      <Connector />

      <EmphasisCard
        eyebrow={t("heroFlowResultGroup")}
        label={t("finalBalance")}
        amount={finalBalanceAmount}
        currency={currency}
        locale={locale}
        tone={resultTone(finalBalanceAmount)}
      />
    </div>
  );
}
