import { AlertTriangle, ArrowRight, ShieldCheck, XCircle } from "lucide-react";
import { useMemo } from "react";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import { savingsCoachCardDict } from "@/utils/i18n/wizard/stepSavings/SavingsCoachCard.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type Props = {
  disposableAfterExpensesMonthly: number;
  disposableAfterExpensesAndSavingsMonthly: number;
  totalSavingsMonthly: number;
  goalsCount: number;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
};

type Status = "deficit" | "tight" | "ok";

const num = (v: number) => (Number.isFinite(v) ? v : 0);

function classify(margin: number): Status {
  if (margin < 0) return "deficit";
  if (margin < 1500) return "tight";
  return "ok";
}

export default function SavingsCoachCard({
  disposableAfterExpensesMonthly,
  disposableAfterExpensesAndSavingsMonthly,
  totalSavingsMonthly,
  goalsCount,
  onPrimaryAction,
  primaryActionLabel,
}: Props) {
  const currency = useAppCurrency();
  const locale = useAppLocale();

  const t = <K extends keyof typeof savingsCoachCardDict.sv>(k: K) =>
    tDict(k, locale, savingsCoachCardDict);

  const money0 = (v: number) =>
    formatMoneyV2(num(v), currency, locale, { fractionDigits: 0 });

  const afterExpenses = num(disposableAfterExpensesMonthly);
  const afterSavings = num(disposableAfterExpensesAndSavingsMonthly);
  const status = useMemo(() => classify(afterSavings), [afterSavings]);

  const ui = useMemo(() => {
    if (status === "deficit") {
      return {
        Icon: XCircle,
        badge: t("badgeDeficit"),
        tone: "danger" as const,
        title: t("titleDeficit"),
        bullets: [
          t("bulletDeficitMissingTemplate").replace(
            "{amount}",
            money0(Math.abs(afterSavings)),
          ),
          t("bulletDeficitAdjust"),
        ],
        hint:
          goalsCount > 0 ? t("hintDeficitWithGoals") : t("hintDeficitNoGoals"),
      };
    }

    if (status === "tight") {
      return {
        Icon: AlertTriangle,
        badge: t("badgeTight"),
        tone: "warn" as const,
        title: t("titleTight"),
        bullets: [
          t("bulletTightLeftTemplate").replace(
            "{amount}",
            money0(afterSavings),
          ),
          t("bulletTightDiscipline"),
        ],
        hint: t("hintTight"),
      };
    }

    return {
      Icon: ShieldCheck,
      badge: t("badgeOk"),
      tone: "ok" as const,
      title: t("titleOk"),
      bullets: [
        t("bulletOkAfterExpensesTemplate").replace(
          "{amount}",
          money0(afterExpenses),
        ),
        t("bulletOkAfterSavingsTemplate").replace(
          "{amount}",
          money0(afterSavings),
        ),
      ],
      hint:
        goalsCount > 0
          ? t("hintOkWithGoals")
          : totalSavingsMonthly > 0
            ? t("hintOkWithSavingsNoGoals")
            : t("hintOkNoSavings"),
    };
  }, [status, afterExpenses, afterSavings, goalsCount, totalSavingsMonthly, t]);

  const toneStyles =
    ui.tone === "danger"
      ? {
          icon: "text-wizard-warning",
          chip: "border-wizard-warning/25 bg-wizard-warning/10 text-wizard-warning",
          rail: "bg-wizard-warning/10 border-wizard-warning/20",
        }
      : ui.tone === "warn"
        ? {
            icon: "text-wizard-warning",
            chip: "border-wizard-warning/20 bg-wizard-warning/10 text-wizard-text",
            rail: "bg-wizard-shell/45 border-wizard-stroke/20",
          }
        : {
            icon: "text-wizard-accent",
            chip: "border-wizard-stroke/25 bg-wizard-shell/45 text-wizard-text",
            rail: "bg-wizard-shell/45 border-wizard-stroke/20",
          };

  return (
    <div
      className="
        rounded-3xl
        bg-wizard-shell/70 border border-wizard-stroke/25
        shadow-[0_10px_30px_rgba(2,6,23,0.10)]
        p-4 sm:p-6
        space-y-4
        overflow-hidden
      "
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-2xl",
              "bg-wizard-surface border border-wizard-stroke/20",
              "shadow-[0_6px_14px_rgba(2,6,23,0.06)]",
            )}
          >
            <ui.Icon className={cn("h-5 w-5", toneStyles.icon)} />
          </div>

          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold",
              "truncate",
              toneStyles.chip,
            )}
          >
            {ui.badge}
          </span>
        </div>

        <span className="shrink-0 text-[11px] font-semibold text-wizard-text/45">
          {t("beforeDebts")}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-base font-semibold text-wizard-text">{ui.title}</p>

        <ul className="space-y-1.5">
          {ui.bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 text-sm text-wizard-text/70"
            >
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-wizard-text/25" />
              <span className="leading-snug">{b}</span>
            </li>
          ))}
        </ul>

        <div className={cn("rounded-2xl border px-4 py-3", toneStyles.rail)}>
          <p className="text-xs text-wizard-text/65 leading-relaxed">
            {ui.hint}
          </p>
        </div>
      </div>

      {onPrimaryAction ? (
        <div className="pt-1">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="
              inline-flex items-center gap-2 rounded-2xl px-4 py-2
              bg-wizard-surface border border-wizard-stroke/20
              text-sm font-semibold text-wizard-text
              shadow-sm shadow-black/5
              transition-colors
              hover:border-wizard-stroke/35
              hover:bg-wizard-stroke/10
              focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45
            "
          >
            {primaryActionLabel ?? t("ctaAdjust")}
            <ArrowRight className="h-4 w-4 text-wizard-text/70" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
