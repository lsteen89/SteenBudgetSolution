import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import { goalFeasibilityRowDict } from "@/utils/i18n/wizard/stepSavings/GoalFeasibilityRow.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useMemo } from "react";

type Props = {
  title: string;
  monthlyContribution: number;
  targetAmount?: number;
  amountSaved?: number;
};

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

const ceilMonths = (remaining: number, monthly: number) =>
  monthly > 0 ? Math.max(0, Math.ceil(remaining / monthly)) : null;

export default function GoalFeasibilityRow({
  title,
  monthlyContribution,
  targetAmount,
  amountSaved,
}: Props) {
  const currency = useAppCurrency();
  const locale = useAppLocale();

  const t = <K extends keyof typeof goalFeasibilityRowDict.sv>(k: K) =>
    tDict(k, locale, goalFeasibilityRowDict);

  const money0 = (v: number) =>
    formatMoneyV2(num(v), currency, locale, { fractionDigits: 0 });

  const contrib = num(monthlyContribution);
  const target = num(targetAmount);
  const saved = num(amountSaved);
  const remaining = Math.max(0, target - saved);

  const etaMonths = useMemo(() => {
    if (target <= 0) return null;
    return ceilMonths(remaining, contrib);
  }, [target, remaining, contrib]);

  const statusLine = useMemo(() => {
    if (target <= 0) {
      return contrib > 0
        ? t("statusNoTargetWithContribution")
        : t("statusNoTargetNoContribution");
    }

    if (remaining === 0) return t("statusDone");

    if (contrib <= 0) {
      return t("statusNoContributionTemplate").replace(
        "{amount}",
        money0(target),
      );
    }

    if (etaMonths === 1) return t("statusOneMonth");

    if (etaMonths != null && etaMonths <= 12) {
      return t("statusMonthsLeftTemplate").replace(
        "{months}",
        String(etaMonths),
      );
    }

    if (etaMonths != null && etaMonths <= 36) {
      return t("statusLongTermTemplate").replace("{months}", String(etaMonths));
    }

    return etaMonths != null
      ? t("statusSlowTemplate").replace("{months}", String(etaMonths))
      : "—";
  }, [target, remaining, contrib, etaMonths, money0, t]);

  const tone =
    target > 0 && remaining === 0
      ? "done"
      : contrib <= 0
        ? "missing"
        : etaMonths != null && etaMonths <= 12
          ? "good"
          : etaMonths != null && etaMonths <= 36
            ? "ok"
            : "slow";

  const chipText =
    tone === "done"
      ? t("chipDone")
      : tone === "missing"
        ? t("chipMissing")
        : tone === "good"
          ? t("chipGood")
          : tone === "ok"
            ? t("chipOk")
            : t("chipSlow");

  const etaShort =
    etaMonths != null
      ? t("etaShortTemplate").replace("{months}", String(etaMonths))
      : null;

  return (
    <div className="py-2">
      <div
        className={cn(
          "flex flex-col gap-2 rounded-2xl px-4 py-3",
          "sm:flex-row sm:items-start sm:justify-between sm:gap-3",
          "bg-wizard-surface border border-wizard-stroke/20",
          "shadow-[0_6px_14px_rgba(2,6,23,0.06)]",
          "transition-colors hover:border-wizard-stroke/30",
        )}
      >
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-wizard-text">
                {title}
              </p>

              <span
                className={cn(
                  "mt-1 inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  "sm:hidden",
                  tone === "done" &&
                    "border-wizard-accent/20 bg-wizard-accent/10 text-wizard-accent",
                  tone === "missing" &&
                    "border-wizard-warning/25 bg-wizard-warning/10 text-wizard-warning",
                  tone === "good" &&
                    "border-wizard-accent/20 bg-wizard-accent/10 text-wizard-text",
                  tone === "ok" &&
                    "border-wizard-stroke/25 bg-wizard-shell/45 text-wizard-text/80",
                  tone === "slow" &&
                    "border-wizard-stroke/25 bg-wizard-shell/35 text-wizard-text/70",
                )}
              >
                {chipText}
              </span>
            </div>

            <div className="shrink-0 sm:hidden">
              <div
                className={cn(
                  "inline-flex items-baseline rounded-full px-3 py-1.5",
                  "bg-wizard-shell/55 border border-wizard-stroke/20",
                  "shadow-[0_6px_14px_rgba(2,6,23,0.06)]",
                )}
              >
                <span className="tabular-nums font-semibold text-wizard-accent">
                  {contrib > 0 ? money0(contrib) : "—"}
                </span>
                <span className="ml-1 text-xs font-semibold text-wizard-text/60">
                  {t("perMonthSuffix")}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-1 text-xs text-wizard-text/60 leading-snug flex flex-wrap gap-x-2 gap-y-1">
            {target > 0 ? (
              <>
                {t("remainingLabel")}:{" "}
                <span className="font-semibold text-wizard-text/80 tabular-nums">
                  {money0(remaining)}
                </span>
                {saved > 0 ? (
                  <>
                    <span className="text-wizard-text/35">·</span>
                    {t("savedLabel")}:{" "}
                    <span className="font-semibold text-wizard-text/80 tabular-nums">
                      {money0(saved)}
                    </span>
                  </>
                ) : null}
                {etaMonths != null && contrib > 0 && remaining > 0 ? (
                  <>
                    <span className="text-wizard-text/35"> • </span>
                    <span className="sm:hidden font-semibold text-wizard-text/70">
                      {etaShort}
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              t("targetMissing")
            )}
          </p>

          <p className="mt-2 text-sm text-wizard-text/70 leading-snug">
            {statusLine}
          </p>
        </div>

        <div className="hidden sm:block shrink-0 text-right">
          <div
            className={cn(
              "inline-flex items-baseline rounded-full px-3 py-1.5",
              "bg-wizard-shell/55 border border-wizard-stroke/20",
              "shadow-[0_6px_14px_rgba(2,6,23,0.06)]",
            )}
          >
            <span className="tabular-nums font-semibold text-wizard-accent">
              {contrib > 0 ? money0(contrib) : "—"}
            </span>
            <span className="ml-1 text-xs font-semibold text-wizard-text/60">
              {t("perMonthSuffix")}
            </span>
          </div>

          <div className="mt-1 hidden sm:block">
            {etaMonths != null && contrib > 0 && target > 0 && remaining > 0 ? (
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  "border border-wizard-stroke/20 bg-wizard-surface",
                  "text-wizard-text/60",
                )}
              >
                {etaShort}
              </span>
            ) : (
              <span className="block h-[18px]" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
