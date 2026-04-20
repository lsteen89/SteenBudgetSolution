import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import { goalFeasibilityRowDict } from "@/utils/i18n/wizard/stepSavings/GoalFeasibilityRow.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { Star } from "lucide-react";
import { useMemo } from "react";

type Props = {
  title: string;
  monthlyContribution: number;
  targetAmount?: number;
  amountSaved?: number;
  isFavorite?: boolean;
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
  isFavorite,
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

  const etaShort =
    etaMonths != null
      ? t("etaShortTemplate").replace("{months}", String(etaMonths))
      : null;

  return (
    <div className="py-2">
      <div
        className={cn(
          "rounded-2xl border bg-wizard-surface",
          "border-wizard-stroke/20 shadow-[0_6px_14px_rgba(2,6,23,0.06)]",
          "px-3 py-2.5 sm:px-4 sm:py-3",
          "transition-colors hover:border-wizard-stroke/30",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold text-wizard-text">
                {title}
              </p>

              {isFavorite ? (
                <>
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-700 sm:hidden">
                    <Star className="h-3 w-3 fill-current" />
                  </span>

                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {t("favoriteGoal")}
                  </span>
                </>
              ) : null}
            </div>

            <p
              className={cn(
                "mt-1 text-xs leading-snug sm:mt-2 sm:text-sm",
                tone === "done" && "text-wizard-accent",
                tone === "missing" && "text-wizard-warning",
                tone === "good" && "text-wizard-text/75",
                tone === "ok" && "text-wizard-text/70",
                tone === "slow" && "text-wizard-text/65",
              )}
            >
              {statusLine}
            </p>

            <p className="mt-2 hidden flex-wrap gap-x-2 gap-y-1 text-xs leading-snug text-wizard-text/60 sm:flex">
              {target > 0 ? (
                <>
                  {t("remainingLabel")}:{" "}
                  <span className="tabular-nums font-semibold text-wizard-text/80">
                    {money0(remaining)}
                  </span>
                  {saved > 0 ? (
                    <>
                      <span className="text-wizard-text/35">•</span>
                      {t("savedLabel")}:{" "}
                      <span className="tabular-nums font-semibold text-wizard-text/80">
                        {money0(saved)}
                      </span>
                    </>
                  ) : null}
                </>
              ) : (
                t("targetMissing")
              )}
            </p>
          </div>

          <div className="shrink-0">
            <div
              className={cn(
                "inline-flex items-baseline rounded-full border",
                "bg-wizard-shell/55 border-wizard-stroke/20",
                "shadow-[0_6px_14px_rgba(2,6,23,0.06)]",
                "px-2.5 py-1 sm:px-3 sm:py-1.5",
              )}
            >
              <span className="tabular-nums text-sm font-semibold text-wizard-accent sm:text-base">
                {contrib > 0 ? money0(contrib) : "—"}
              </span>
              <span className="ml-1 text-[11px] font-semibold text-wizard-text/60 sm:text-xs">
                {t("perMonthSuffix")}
              </span>
            </div>

            <div className="mt-1 hidden sm:block text-right">
              {etaMonths != null &&
              contrib > 0 &&
              target > 0 &&
              remaining > 0 ? (
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    "border border-wizard-stroke/20 bg-wizard-surface text-wizard-text/60",
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
    </div>
  );
}
