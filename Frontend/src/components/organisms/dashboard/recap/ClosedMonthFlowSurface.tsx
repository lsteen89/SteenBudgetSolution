import { cn } from "@/lib/utils";
import type { BudgetMonthRecapDto } from "@/types/budget/BudgetMonthRecapDto";
import type { AppLocale } from "@/types/i18n/appLocale";
import { closedMonthRecapDict } from "@/utils/i18n/pages/private/dashboard/recap/ClosedMonthRecapSection.i18n";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import {
  ArrowDown,
  ArrowRight,
  Landmark,
  PiggyBank,
  ReceiptText,
  Scale,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type RecapTKey = keyof typeof closedMonthRecapDict.sv;
type RecapT = <K extends RecapTKey>(key: K) => string;
type FlowValueTone =
  | "structural"
  | "allocation"
  | "positive"
  | "attention"
  | "balanced";

type FlowValue = {
  label: string;
  amount: number;
  tone: FlowValueTone;
  Icon: LucideIcon;
  dataTestId?: string;
};

type FlowColumnProps = {
  title: string;
  helper: string;
  values: FlowValue[];
  emphasized?: boolean;
};

function formatSnapshotMoney(
  value: number,
  currency: CurrencyCode,
  locale: string,
) {
  return formatMoneyV2(value, currency, locale);
}

function resultTone(finalBalance: number): FlowValueTone {
  if (finalBalance > 0) return "positive";
  if (finalBalance < 0) return "attention";
  return "balanced";
}

function valueToneClasses(tone: FlowValueTone) {
  if (tone === "positive") {
    return {
      icon: "bg-emerald-100/75 text-emerald-700",
      value: "text-emerald-800",
    };
  }

  if (tone === "attention") {
    return {
      icon: "bg-rose-100/75 text-rose-700",
      value: "text-rose-700",
    };
  }

  if (tone === "allocation") {
    return {
      icon: "bg-white/70 text-eb-text/55 ring-1 ring-[rgb(199_228_255_/_0.5)]",
      value: "text-eb-text",
    };
  }

  if (tone === "balanced") {
    return {
      icon: "bg-eb-accentSoft/65 text-eb-accent",
      value: "text-eb-text",
    };
  }

  return {
    icon: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    value: "text-eb-text",
  };
}

function FlowValueRow({
  value,
  currency,
  locale,
  emphasized = false,
}: {
  value: FlowValue;
  currency: CurrencyCode;
  locale: AppLocale;
  emphasized?: boolean;
}) {
  const classes = valueToneClasses(value.tone);
  const Icon = value.Icon;

  return (
    <div
      data-testid={value.dataTestId}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            classes.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 truncate text-sm font-bold leading-5 text-eb-text/74">
          {value.label}
        </span>
      </div>
      <span
        className={cn(
          "shrink-0 text-right font-extrabold leading-6 tabular-nums",
          emphasized ? "text-2xl sm:text-[1.7rem]" : "text-lg",
          classes.value,
        )}
      >
        {formatSnapshotMoney(value.amount, currency, locale)}
      </span>
    </div>
  );
}

function FlowColumn({
  title,
  helper,
  values,
  emphasized = false,
  currency,
  locale,
}: FlowColumnProps & {
  currency: CurrencyCode;
  locale: AppLocale;
}) {
  return (
    <section
      className={cn(
        "relative min-w-0 rounded-2xl border p-4 sm:p-5",
        emphasized
          ? "border-[rgb(199_228_255_/_0.75)] bg-[rgb(224_240_255_/_0.55)] shadow-[0_18px_42px_rgb(21_39_81_/_0.07)]"
          : "border-[rgb(199_228_255_/_0.35)] bg-white/80",
      )}
    >
      {emphasized ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,rgba(199,228,255,0),rgba(60,97,117,0.35),rgba(199,228,255,0))]"
        />
      ) : null}
      <div className="mb-2.5">
        <h3 className="text-sm font-extrabold tracking-normal text-eb-text">
          {title}
        </h3>
        <p className="mt-1 text-xs font-semibold leading-5 text-eb-text/54">
          {helper}
        </p>
      </div>

      <div className="divide-y divide-[rgb(199_228_255_/_0.42)]">
        {values.map((value) => (
          <FlowValueRow
            key={value.label}
            value={value}
            currency={currency}
            locale={locale}
            emphasized={emphasized}
          />
        ))}
      </div>
    </section>
  );
}

function FlowConnector() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center lg:min-h-full"
    >
      <div className="hidden w-full items-center lg:flex lg:-mx-1">
        <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(199,228,255,0),rgba(60,97,117,0.38))]" />
        <span className="mx-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(199_228_255_/_0.72)] bg-white/95 text-eb-accent shadow-[0_10px_24px_rgb(21_39_81_/_0.06)]">
          <ArrowRight className="h-4 w-4" />
        </span>
        <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(60,97,117,0.38),rgba(199,228,255,0))]" />
      </div>

      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(199_228_255_/_0.7)] bg-white/95 text-eb-accent shadow-[0_8px_18px_rgb(21_39_81_/_0.055)] lg:hidden">
        <ArrowDown className="h-4 w-4" />
      </span>
    </div>
  );
}

export default function ClosedMonthFlowSurface({
  recap,
  currency,
  locale,
  t,
}: {
  recap: BudgetMonthRecapDto;
  currency: CurrencyCode;
  locale: AppLocale;
  t: RecapT;
}) {
  const carryOverAmount =
    recap.month.carryOverMode === "none" || recap.month.carryOverAmount == null
      ? 0
      : recap.month.carryOverAmount;
  const income = recap.snapshotTotals.totalIncomeMonthly;
  const expenses = recap.snapshotTotals.totalExpensesMonthly;
  const savings = recap.snapshotTotals.totalSavingsMonthly;
  const debtPayments = recap.snapshotTotals.totalDebtPaymentsMonthly;
  const finalBalance = recap.snapshotTotals.finalBalanceMonthly;

  const inputValues: FlowValue[] = [
    {
      label: t("flowCarryOverLabel"),
      amount: carryOverAmount,
      tone: "structural",
      Icon: ArrowRight,
      dataTestId: "closed-month-chart-flow-carry-over",
    },
    {
      label: t("flowIncomeLabel"),
      amount: income,
      tone: "structural",
      Icon: WalletCards,
      dataTestId: "closed-month-chart-flow-income",
    },
  ];

  const movementValues: FlowValue[] = [
    {
      label: t("expenses"),
      amount: expenses,
      tone: "allocation",
      Icon: ReceiptText,
      dataTestId: "closed-month-chart-flow-expenses",
    },
    {
      label: t("savings"),
      amount: savings,
      tone: "allocation",
      Icon: PiggyBank,
      dataTestId: "closed-month-chart-flow-savings",
    },
    {
      label: t("debtPayments"),
      amount: debtPayments,
      tone: "allocation",
      Icon: Landmark,
      dataTestId: "closed-month-chart-flow-debt-payments",
    },
  ];

  const resultValues: FlowValue[] = [
    {
      label: t("flowFinalBalanceLabel"),
      amount: finalBalance,
      tone: resultTone(finalBalance),
      Icon: Scale,
      dataTestId: "closed-month-chart-flow-final-balance",
    },
  ];

  return (
    <div
      data-testid="closed-month-chart-flow"
      className="rounded-2xl border border-[rgb(199_228_255_/_0.55)] bg-[linear-gradient(180deg,rgba(247,251,255,0.9),rgba(224,240,255,0.32))] p-3 sm:p-4"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_64px_minmax(0,1.04fr)_64px_minmax(0,0.94fr)] lg:items-stretch">
        <FlowColumn
          title={t("chartFlowInputs")}
          helper={t("chartFlowInputsBody")}
          values={inputValues}
          currency={currency}
          locale={locale}
        />
        <FlowConnector />
        <FlowColumn
          title={t("chartFlowMovement")}
          helper={t("chartFlowMovementBody")}
          values={movementValues}
          currency={currency}
          locale={locale}
        />
        <FlowConnector />
        <FlowColumn
          title={t("chartFlowResult")}
          helper={t("chartFlowResultBody")}
          values={resultValues}
          currency={currency}
          locale={locale}
          emphasized
        />
      </div>
      <p className="mt-3 rounded-xl border border-[rgb(199_228_255_/_0.38)] bg-white/52 px-3 py-2 text-xs font-semibold leading-5 text-eb-text/58">
        {t("flowCarryOverNote")}
      </p>
    </div>
  );
}
