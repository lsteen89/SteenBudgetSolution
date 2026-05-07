import ClosedMonthHeroMobileFlow from "@/components/organisms/dashboard/recap/ClosedMonthHeroMobileFlow";
import { cn } from "@/lib/utils";
import type { BudgetMonthRecapDto } from "@/types/budget/BudgetMonthRecapDto";
import { closedMonthRecapDict } from "@/utils/i18n/pages/private/dashboard/recap/ClosedMonthRecapSection.i18n";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import {
  ArrowRightLeft,
  Landmark,
  PiggyBank,
  ReceiptText,
  Scale,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

type RecapTKey = keyof typeof closedMonthRecapDict.sv;
type RecapT = <K extends RecapTKey>(key: K) => string;
type NodeTone =
  | "input"
  | "pool"
  | "allocation"
  | "positive"
  | "balanced"
  | "attention";
type LinkTone = "input" | "expense" | "savings" | "debt" | "result" | "attention";
type NodeId =
  | "carryOver"
  | "income"
  | "available"
  | "expenses"
  | "savings"
  | "debts"
  | "finalBalance";

type ClosedMonthSankeyInput = {
  carryOverAmount: number;
  incomeAmount: number;
  expenseAmount: number;
  savingsAmount: number;
  debtPaymentAmount: number;
  finalBalanceAmount: number;
};

type FlowNode = {
  id: NodeId;
  label: string;
  amount: number;
  tone: NodeTone;
  Icon: LucideIcon;
  dataTestId: string;
};

type FlowLink = {
  id: string;
  amount: number;
  tone: LinkTone;
  path: string;
};

type ClosedMonthHeroSankeyProps = {
  recap: BudgetMonthRecapDto;
  currency: CurrencyCode;
  locale: string;
  nextMonthLabel: string;
  t: RecapT;
};

const desktopViewBox = {
  width: 1000,
  height: 420,
};

function replaceToken(value: string, token: string, replacement: string) {
  return value.replace(`{${token}}`, replacement);
}

function formatSnapshotMoney(
  value: number,
  currency: CurrencyCode,
  locale: string,
) {
  return formatMoneyV2(value, currency, locale);
}

function resultTone(finalBalance: number): NodeTone {
  if (finalBalance > 0) return "positive";
  if (finalBalance < 0) return "attention";
  return "balanced";
}

function resultLinkTone(finalBalance: number): LinkTone {
  if (finalBalance < 0) return "attention";

  return "result";
}

function toSankeyInput(recap: BudgetMonthRecapDto): ClosedMonthSankeyInput {
  // Carry-over is sourced from the explicit outcome rather than the next-month
  // row's stored CarryOverAmount, which is null for `full` mode.
  const carryOverAmount = recap.carryOverOutcome.wasApplied
    ? recap.carryOverOutcome.amount
    : 0;

  return {
    carryOverAmount,
    incomeAmount: recap.snapshotTotals.totalIncomeMonthly,
    expenseAmount: recap.snapshotTotals.totalExpensesMonthly,
    savingsAmount: recap.snapshotTotals.totalSavingsMonthly,
    debtPaymentAmount: recap.snapshotTotals.totalDebtPaymentsMonthly,
    finalBalanceAmount: recap.snapshotTotals.finalBalanceMonthly,
  };
}

function curvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tension = 0.5,
) {
  const dx = x2 - x1;
  const cp1x = x1 + dx * tension;
  const cp2x = x2 - dx * tension;

  return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
}

function getStrokeWidth(amount: number, maxAmount: number) {
  if (maxAmount <= 0) return 4;

  const ratio = Math.abs(amount) / maxAmount;

  return Math.max(4, Math.min(20, ratio * 20));
}

function buildFlowNodes(
  input: ClosedMonthSankeyInput,
  t: RecapT,
): Record<NodeId, FlowNode> {
  const availableAmount = input.carryOverAmount + input.incomeAmount;

  return {
    carryOver: {
      id: "carryOver",
      label: t("flowCarryOverLabel"),
      amount: input.carryOverAmount,
      tone: "input",
      Icon: ArrowRightLeft,
      dataTestId: "closed-month-hero-flow-carry-over",
    },
    income: {
      id: "income",
      label: t("income"),
      amount: input.incomeAmount,
      tone: "input",
      Icon: WalletCards,
      dataTestId: "closed-month-hero-flow-income",
    },
    available: {
      id: "available",
      label: t("heroAvailableShort"),
      amount: availableAmount,
      tone: "pool",
      Icon: WalletCards,
      dataTestId: "closed-month-hero-flow-available",
    },
    expenses: {
      id: "expenses",
      label: t("expenses"),
      amount: input.expenseAmount,
      tone: "allocation",
      Icon: ReceiptText,
      dataTestId: "closed-month-hero-flow-expenses",
    },
    savings: {
      id: "savings",
      label: t("savings"),
      amount: input.savingsAmount,
      tone: "allocation",
      Icon: PiggyBank,
      dataTestId: "closed-month-hero-flow-savings",
    },
    debts: {
      id: "debts",
      label: t("heroDebtShort"),
      amount: input.debtPaymentAmount,
      tone: "allocation",
      Icon: Landmark,
      dataTestId: "closed-month-hero-flow-debt-payments",
    },
    finalBalance: {
      id: "finalBalance",
      label: t("finalBalance"),
      amount: input.finalBalanceAmount,
      tone: resultTone(input.finalBalanceAmount),
      Icon: Scale,
      dataTestId: "closed-month-hero-flow-final-balance",
    },
  };
}

const HUB_RIGHT_X = 484;
const OUTPUT_LEFT_X = 712;
const INPUT_RIGHT_X = 232;
const HUB_LEFT_X = 388;

const Y = {
  carryOver: 130,
  income: 290,
  hubInTop: 208,
  hubInBot: 230,
  hubOutExpense: 198,
  hubOutSavings: 216,
  hubOutDebts: 234,
  hubOutResult: 268,
  expenses: 70,
  savings: 152,
  debts: 234,
  finalBalance: 360,
} as const;

function buildFlowLinks(input: ClosedMonthSankeyInput): FlowLink[] {
  return [
    {
      id: "carryOver-available",
      amount: input.carryOverAmount,
      tone: "input",
      path: curvePath(INPUT_RIGHT_X, Y.carryOver, HUB_LEFT_X, Y.hubInTop),
    },
    {
      id: "income-available",
      amount: input.incomeAmount,
      tone: "input",
      path: curvePath(INPUT_RIGHT_X, Y.income, HUB_LEFT_X, Y.hubInBot),
    },
    {
      id: "available-expenses",
      amount: input.expenseAmount,
      tone: "expense",
      path: curvePath(HUB_RIGHT_X, Y.hubOutExpense, OUTPUT_LEFT_X, Y.expenses),
    },
    {
      id: "available-savings",
      amount: input.savingsAmount,
      tone: "savings",
      path: curvePath(HUB_RIGHT_X, Y.hubOutSavings, OUTPUT_LEFT_X, Y.savings),
    },
    {
      id: "available-debts",
      amount: input.debtPaymentAmount,
      tone: "debt",
      path: curvePath(HUB_RIGHT_X, Y.hubOutDebts, OUTPUT_LEFT_X, Y.debts),
    },
    {
      id: "available-finalBalance",
      amount: input.finalBalanceAmount,
      tone: resultLinkTone(input.finalBalanceAmount),
      path: curvePath(
        HUB_RIGHT_X,
        Y.hubOutResult,
        OUTPUT_LEFT_X,
        Y.finalBalance,
        0.55,
      ),
    },
  ];
}

function maxFlowAmount(input: ClosedMonthSankeyInput) {
  return Math.max(
    1,
    Math.abs(input.carryOverAmount),
    Math.abs(input.incomeAmount),
    Math.abs(input.expenseAmount),
    Math.abs(input.savingsAmount),
    Math.abs(input.debtPaymentAmount),
    Math.abs(input.finalBalanceAmount),
  );
}

function nodeToneClasses(tone: NodeTone) {
  if (tone === "positive") {
    return {
      card: "border-emerald-200/85 bg-emerald-50/85 ring-1 ring-emerald-100/80",
      icon: "bg-emerald-100 text-emerald-700",
      value: "text-emerald-800",
      eyebrow: "text-emerald-700",
    };
  }

  if (tone === "attention") {
    return {
      card: "border-rose-200/80 bg-rose-50/85 ring-1 ring-rose-100/70",
      icon: "bg-rose-100 text-rose-700",
      value: "text-rose-700",
      eyebrow: "text-rose-700",
    };
  }

  if (tone === "pool") {
    return {
      card: "border-[rgb(117_174_205_/_0.5)] bg-[rgb(246_251_255_/_0.96)] ring-1 ring-[rgb(199_228_255_/_0.62)]",
      icon: "bg-eb-accentSoft/76 text-eb-accent",
      value: "text-eb-text",
      eyebrow: "text-eb-accent",
    };
  }

  if (tone === "allocation") {
    return {
      card: "border-eb-stroke/22 bg-white/92",
      icon: "bg-eb-shell/80 text-eb-text/58",
      value: "text-eb-text",
      eyebrow: "text-eb-text/50",
    };
  }

  if (tone === "balanced") {
    return {
      card: "border-[rgb(199_228_255_/_0.7)] bg-eb-accentSoft/22 ring-1 ring-eb-accentSoft/45",
      icon: "bg-eb-accentSoft/65 text-eb-accent",
      value: "text-eb-text",
      eyebrow: "text-eb-accent",
    };
  }

  return {
    card: "border-[rgb(199_228_255_/_0.66)] bg-white/95",
    icon: "bg-sky-50 text-sky-700",
    value: "text-eb-text",
    eyebrow: "text-eb-text/50",
  };
}

function linkStroke(tone: LinkTone) {
  if (tone === "savings") return "rgba(31,132,101,0.26)";
  if (tone === "result") return "rgba(31,132,101,0.34)";
  if (tone === "attention") return "rgba(190,79,91,0.22)";
  if (tone === "expense") return "rgba(68,105,124,0.18)";
  if (tone === "debt") return "rgba(68,105,124,0.16)";

  return "rgba(46,130,168,0.24)";
}

function FlowNodeCard({
  node,
  currency,
  locale,
  className,
  emphasized = false,
  eyebrow,
}: {
  node: FlowNode;
  currency: CurrencyCode;
  locale: string;
  className?: string;
  emphasized?: boolean;
  eyebrow?: string;
}) {
  const classes = nodeToneClasses(node.tone);
  const Icon = node.Icon;

  return (
    <article
      aria-label={node.label}
      data-testid={node.dataTestId}
      className={cn(
        "rounded-2xl border px-3.5 py-2.5 shadow-[0_14px_30px_rgb(21_39_81_/_0.05)] backdrop-blur",
        classes.card,
        emphasized && "px-4 py-3 shadow-[0_18px_44px_rgb(21_39_81_/_0.07)]",
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "mb-1 text-[10px] font-bold uppercase tracking-[0.12em]",
            classes.eyebrow,
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl",
            classes.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 text-sm font-extrabold leading-5 text-eb-text/74">
          {node.label}
        </span>
      </div>
      <p
        data-testid={
          node.id === "finalBalance"
            ? "closed-month-hero-final-balance"
            : undefined
        }
        className={cn(
          "mt-1.5 text-right font-extrabold leading-6 tabular-nums tracking-normal",
          emphasized ? "text-xl" : "text-lg",
          classes.value,
        )}
      >
        {formatSnapshotMoney(node.amount, currency, locale)}
      </p>
    </article>
  );
}

function DesktopFlow({
  nodes,
  links,
  maxAmount,
  currency,
  locale,
  resultEyebrow,
  hubEyebrow,
}: {
  nodes: Record<NodeId, FlowNode>;
  links: FlowLink[];
  maxAmount: number;
  currency: CurrencyCode;
  locale: string;
  resultEyebrow: string;
  hubEyebrow: string;
}) {
  return (
    <div className="relative hidden min-h-[420px] overflow-hidden rounded-2xl border border-[rgb(199_228_255_/_0.5)] bg-[radial-gradient(circle_at_42%_45%,rgba(224,240,255,0.78),rgba(255,255,255,0.18)_36%,transparent_70%)] lg:block">
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${desktopViewBox.width} ${desktopViewBox.height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="hero-flow-divider" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="rgba(199,228,255,0)" />
            <stop offset="0.55" stopColor="rgba(60,97,117,0.32)" />
            <stop offset="1" stopColor="rgba(199,228,255,0)" />
          </linearGradient>
        </defs>
        <g fill="none" strokeLinecap="round">
          {links.map((link) => (
            <path
              key={link.id}
              d={link.path}
              stroke={linkStroke(link.tone)}
              strokeWidth={getStrokeWidth(link.amount, maxAmount)}
            />
          ))}
        </g>
        <line
          x1={OUTPUT_LEFT_X - 8}
          x2={desktopViewBox.width - 50}
          y1={310}
          y2={310}
          stroke="url(#hero-flow-divider)"
          strokeWidth={1}
          strokeDasharray="2 5"
        />
      </svg>

      <FlowNodeCard
        node={nodes.carryOver}
        currency={currency}
        locale={locale}
        className="absolute left-[4%] top-[30%] w-[19%] min-w-[160px] -translate-y-1/2"
      />
      <FlowNodeCard
        node={nodes.income}
        currency={currency}
        locale={locale}
        className="absolute left-[4%] top-[68%] w-[19%] min-w-[160px] -translate-y-1/2"
      />
      <FlowNodeCard
        node={nodes.available}
        currency={currency}
        locale={locale}
        emphasized
        eyebrow={hubEyebrow}
        className="absolute left-[39%] top-[51%] w-[20%] min-w-[176px] -translate-x-1/2 -translate-y-1/2"
      />

      <FlowNodeCard
        node={nodes.expenses}
        currency={currency}
        locale={locale}
        className="absolute right-[4%] top-[16%] w-[22%] min-w-[200px] -translate-y-1/2"
      />
      <FlowNodeCard
        node={nodes.savings}
        currency={currency}
        locale={locale}
        className="absolute right-[4%] top-[36%] w-[22%] min-w-[200px] -translate-y-1/2"
      />
      <FlowNodeCard
        node={nodes.debts}
        currency={currency}
        locale={locale}
        className="absolute right-[4%] top-[56%] w-[22%] min-w-[200px] -translate-y-1/2"
      />
      <div data-testid="closed-month-hero-result">
        <FlowNodeCard
          node={nodes.finalBalance}
          currency={currency}
          locale={locale}
          emphasized
          eyebrow={resultEyebrow}
          className="absolute right-[4%] top-[85%] w-[24%] min-w-[212px] -translate-y-1/2"
        />
      </div>
    </div>
  );
}

export default function ClosedMonthHeroSankey({
  recap,
  currency,
  locale,
  nextMonthLabel,
  t,
}: ClosedMonthHeroSankeyProps) {
  const sankeyInput = useMemo(() => toSankeyInput(recap), [recap]);
  const nodes = useMemo(() => buildFlowNodes(sankeyInput, t), [sankeyInput, t]);
  const links = useMemo(() => buildFlowLinks(sankeyInput), [sankeyInput]);
  const maxAmount = useMemo(() => maxFlowAmount(sankeyInput), [sankeyInput]);
  const hasCarryOver =
    recap.carryOverOutcome.wasApplied && recap.carryOverOutcome.amount > 0;
  const carryOverText = hasCarryOver
    ? replaceToken(
        replaceToken(t("heroCarryOverToNextMonth"), "month", nextMonthLabel),
        "amount",
        formatSnapshotMoney(recap.carryOverOutcome.amount, currency, locale),
      )
    : t("heroCarryOverNoneBody");
  const availableAmount = nodes.available.amount;

  return (
    <section
      aria-label={t("heroFlowLabel")}
      data-testid="closed-month-hero-flow"
      className="min-w-0 rounded-2xl border border-[rgb(199_228_255_/_0.58)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(224,240,255,0.18))] p-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.86)] sm:p-5 lg:p-6"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-eb-text/50">
            {t("heroFlowEyebrow")}
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-normal text-eb-text">
            {t("heroFlowTitle")}
          </h2>
        </div>
        <div className="rounded-2xl border border-eb-stroke/20 bg-white/68 px-3.5 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-eb-text/48">
            {hasCarryOver ? t("heroCarryOverApplied") : t("heroCarryOverNone")}
          </p>
          <p
            data-testid="closed-month-hero-carry-over"
            className={cn(
              "mt-1 text-sm font-extrabold leading-5",
              hasCarryOver ? "text-emerald-800" : "text-eb-text/64",
            )}
          >
            {carryOverText}
          </p>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <DesktopFlow
          nodes={nodes}
          links={links}
          maxAmount={maxAmount}
          currency={currency}
          locale={locale}
          resultEyebrow={t("heroFlowResultGroup")}
          hubEyebrow={t("heroFlowStartGroup")}
        />
        <ClosedMonthHeroMobileFlow
          carryOverAmount={nodes.carryOver.amount}
          incomeAmount={nodes.income.amount}
          availableAmount={availableAmount}
          expenseAmount={nodes.expenses.amount}
          savingsAmount={nodes.savings.amount}
          debtPaymentAmount={nodes.debts.amount}
          finalBalanceAmount={nodes.finalBalance.amount}
          currency={currency}
          locale={locale}
          t={t}
        />
      </div>
    </section>
  );
}
