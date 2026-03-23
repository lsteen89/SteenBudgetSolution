import knightBird from "@/assets/Images/KnightBird.png";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import { cashflowBreakdownDict } from "@/utils/i18n/wizard/stepFinal/CashflowBreakdown.i18n";

function KnightBirdStamp() {
  return (
    <div
      aria-hidden
      className="
        pointer-events-none select-none
        absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
        opacity-[0.1] sm:opacity-[0.20]
      "
    >
      <img
        src={knightBird}
        alt=""
        draggable={false}
        className="
          h-[200px] sm:h-[220px] lg:h-[240px]
          w-auto
          -rotate-[6deg]
          drop-shadow-[0_18px_35px_rgba(2,6,23,0.10)]
          saturate-[0.95]
        "
      />
    </div>
  );
}

function CashflowBreakdown({
  ui,
  money0,
}: {
  ui: {
    totalIncome: number;
    totalExpenditure: number;
    habitSavingsMonthly: number;
    goalSavingsMonthly: number;
    totalDebtPayments: number;
    finalBalance: number;
  };
  money0: (n: number) => string;
}) {
  const locale = useAppLocale();

  const t = <K extends keyof typeof cashflowBreakdownDict.sv>(k: K) =>
    tDict(k, locale, cashflowBreakdownDict);

  const rows = [
    { label: t("income"), value: ui.totalIncome },
    { label: t("expenses"), value: -ui.totalExpenditure },
    { label: t("savingsHabits"), value: -ui.habitSavingsMonthly },
    { label: t("goals"), value: -ui.goalSavingsMonthly },
    { label: t("debtsMinimum"), value: -ui.totalDebtPayments },
  ];

  const isOk = ui.finalBalance >= 0;

  return (
    <div
      className={cn(
        "relative rounded-2xl p-4",
        "bg-wizard-surface-accent/40",
        "border border-wizard-stroke/20",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
      )}
    >
      <KnightBirdStamp />

      <h3 className="text-sm font-semibold text-wizard-text">{t("title")}</h3>

      <div className="relative z-10 mt-3 space-y-2">
        {rows.map((row) => {
          const isNeg = row.value < 0;

          return (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4"
            >
              <span className="text-sm text-wizard-text/70">{row.label}</span>

              <span className="flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-xs font-semibold text-wizard-text/55">
                  {isNeg ? "−" : "+"}
                </span>
                <span className="font-semibold text-wizard-text/90">
                  {money0(Math.abs(row.value))}
                </span>
                <span className="text-xs text-wizard-text/55">
                  {t("perMonthSuffix")}
                </span>
              </span>
            </div>
          );
        })}

        <div className="mt-3 pt-3 border-t border-wizard-stroke/20 flex items-baseline justify-between gap-4">
          <span className="text-sm font-semibold text-wizard-text/80">
            {isOk ? t("remaining") : t("deficit")}
          </span>

          <span className="flex items-baseline gap-2 font-mono tabular-nums">
            <span
              className={cn(
                "text-xs font-semibold",
                isOk ? "text-wizard-accent" : "text-wizard-warning",
              )}
            >
              {isOk ? "+" : "−"}
            </span>

            <span
              className={cn(
                "text-xl font-extrabold",
                isOk ? "text-wizard-accent" : "text-wizard-warning",
              )}
            >
              {money0(Math.abs(ui.finalBalance))}
            </span>

            <span className="text-sm font-semibold text-wizard-text/55">
              {t("perMonthSuffix")}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default CashflowBreakdown;
