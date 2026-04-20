import { WizardMascot } from "@/components/atoms/animation/WizardMascot";
import {
  WizardAccordion,
  WizardAccordionRoot,
} from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { tDict } from "@/utils/i18n/translate";
import { subStepConfirmSavingsDict } from "@/utils/i18n/wizard/stepSavings/SubStepConfirmSavings.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import SavingsBird from "@assets/Images/SavingsBird.png";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import { motion } from "framer-motion";
import { PiggyBank } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import GoalFeasibilityRow from "./components/GoalFeasibilityRow";
import SavingsCoachCard from "./components/SavingsCoachCard";
import WhatIfSavingsCard from "./components/WhatIfSavingsCard";
import { mapFinalizationPreviewToSavingsConfirm } from "./mapping/mapFinalizationPreviewToSavingsConfirm";

type Props = { preview?: BudgetDashboardDto };

export default function SubStepConfirmSavings({ preview }: Props) {
  const currency = useAppCurrency();
  const locale = useAppLocale();

  const t = <K extends keyof typeof subStepConfirmSavingsDict.sv>(k: K) =>
    tDict(k, locale, subStepConfirmSavingsDict);

  const money0 = useCallback(
    (v: number) =>
      formatMoneyV2(v ?? 0, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const [open, setOpen] = useState<string>("");

  const vm = useMemo(() => {
    if (!preview) return null;
    return mapFinalizationPreviewToSavingsConfirm(preview, locale);
  }, [preview, locale]);

  if (!preview || !vm) {
    return (
      <div>
        <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe text-wizard-text space-y-6">
          <WizardStepHeader
            stepPill={{
              stepNumber: 3,
              majorLabel: t("pillMajor"),
              subLabel: t("pillSub"),
            }}
            title={t("titleSummary")}
            subtitle={t("subtitlePreviewMissing")}
            helpTitle={t("helpTitleContinue")}
            helpItems={[t("help1"), t("help2")]}
          />

          <div
            className="
              mx-auto max-w-xl rounded-2xl
              bg-wizard-shell/55 border border-wizard-stroke/20
              px-5 py-4 text-sm text-wizard-text/70
              shadow-lg shadow-black/10
              text-center
            "
          >
            {t("previewMissingBox")}
          </div>
        </section>
      </div>
    );
  }

  const hasAnything =
    vm.totalSavingsMonthly > 0 ||
    vm.monthlySavingsHabit > 0 ||
    vm.totalGoalSavingsMonthly > 0 ||
    vm.goals.length > 0;

  return (
    <div>
      <section className="relative w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe text-wizard-text space-y-6">
        <WizardStepHeader
          stepPill={{
            stepNumber: 3,
            majorLabel: t("pillMajor"),
            subLabel: t("pillSub"),
          }}
          title={t("titleSavings")}
          subtitle={t("subtitleSavings")}
        />

        {!hasAnything ? (
          <div
            className="
              mx-auto max-w-xl rounded-2xl
              bg-wizard-shell/55 border border-wizard-stroke/20
              px-5 py-5
              shadow-lg shadow-black/10
              text-center
            "
          >
            <PiggyBank className="mx-auto mb-3 h-8 w-8 text-wizard-text/55" />
            <p className="text-sm text-wizard-text/70">{t("emptyStateText")}</p>
          </div>
        ) : (
          <>
            <TotalsCard
              totalSavingsMonthly={vm.totalSavingsMonthly}
              monthlySavingsHabit={vm.monthlySavingsHabit}
              totalGoalSavingsMonthly={vm.totalGoalSavingsMonthly}
              money0={money0}
              t={t}
            />

            <SavingsCoachCard
              disposableAfterExpensesMonthly={vm.disposableAfterExpensesMonthly}
              disposableAfterExpensesAndSavingsMonthly={
                vm.disposableAfterExpensesAndSavingsMonthly
              }
              totalSavingsMonthly={vm.totalSavingsMonthly}
              goalsCount={vm.goals.length}
            />

            {vm.goals.length > 0 && (
              <WizardAccordionRoot
                type="single"
                collapsible
                value={open}
                onValueChange={setOpen}
              >
                <WizardAccordion
                  value="goals"
                  isActive={open === "goals"}
                  variant="shell"
                  mobileTotal="below"
                  title={
                    <span className="text-wizard-text text-base font-semibold">
                      {t("goalsTitle")}{" "}
                      <span className="text-wizard-text/50 font-semibold">
                        ({vm.goals.length})
                      </span>
                    </span>
                  }
                  totalText={money0(vm.totalGoalSavingsMonthly)}
                  totalSuffix={t("perMonthSuffix")}
                  subtitle={
                    <div className="text-xs text-wizard-text/60">
                      {t("goalsSubtitle")}
                    </div>
                  }
                >
                  <div className="space-y-0">
                    {vm.goals.map((g) => (
                      <GoalFeasibilityRow
                        key={g.id}
                        title={g.title}
                        monthlyContribution={g.monthlyContribution}
                        targetAmount={g.targetAmount}
                        amountSaved={g.amountSaved}
                        isFavorite={g.isFavorite}
                      />
                    ))}
                  </div>

                  <div className="mt-3 rounded-2xl bg-wizard-shell/40 border border-wizard-stroke/15 px-4 py-3">
                    <p className="text-xs text-wizard-text/65">
                      {t("goalsTip")}
                    </p>
                  </div>
                </WizardAccordion>
              </WizardAccordionRoot>
            )}
          </>
        )}

        <WhatIfSavingsCard
          maxMonthly={
            Math.max(0, vm.disposableAfterExpensesAndSavingsMonthly ?? 0) + 5000
          }
          defaultMonthly={1000}
        />

        <FooterSummary
          incomeTotal={vm.incomeTotal}
          afterExpensesMonthly={vm.disposableAfterExpensesMonthly}
          afterExpensesAndSavingsMonthly={
            vm.disposableAfterExpensesAndSavingsMonthly
          }
          money0={money0}
          t={t}
        />
      </section>
    </div>
  );
}

function TotalsCard({
  totalSavingsMonthly,
  monthlySavingsHabit,
  totalGoalSavingsMonthly,
  money0,
  t,
}: {
  totalSavingsMonthly: number;
  monthlySavingsHabit: number;
  totalGoalSavingsMonthly: number;
  money0: (v: number) => string;
  t: <K extends keyof typeof subStepConfirmSavingsDict.sv>(k: K) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        rounded-3xl
        bg-wizard-shell/70 border border-wizard-stroke/25
        shadow-[0_10px_30px_rgba(2,6,23,0.10)]
        overflow-hidden
      "
    >
      <div className="px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-semibold text-wizard-text/70">
            {t("totalsTitle")}
          </p>

          <div
            className="
              inline-flex items-baseline gap-2
              rounded-full bg-wizard-surface
              border border-wizard-stroke/25
              px-3 py-1.5
              shadow-[0_6px_14px_rgba(2,6,23,0.06)]
            "
          >
            <span className="money text-lg sm:text-xl font-extrabold text-wizard-accent">
              {money0(totalSavingsMonthly)}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-wizard-text/60">
              {t("perMonthSuffix")}
            </span>
          </div>
        </div>

        <p className="mt-2 text-xs text-wizard-text/60">
          {t("totalsSubtitle")}
        </p>
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className="
              rounded-2xl
              bg-wizard-surface
              border border-wizard-stroke/20
              shadow-[0_10px_28px_rgba(0,0,0,0.08)]
              px-4 py-3
            "
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-wizard-text/55">
              {t("habitsTile")}
            </p>
            <p className="mt-1 text-base font-extrabold text-wizard-text">
              <span className="text-darkLimeGreen">
                {money0(monthlySavingsHabit)}
              </span>{" "}
              <span className="text-xs font-semibold text-wizard-text/55">
                {t("perMonthSuffix")}
              </span>
            </p>
          </div>

          <div
            className="
              rounded-2xl
              bg-wizard-surface
              border border-wizard-stroke/20
              shadow-[0_10px_28px_rgba(0,0,0,0.08)]
              px-4 py-3
            "
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-wizard-text/55">
              {t("goalsTile")}
            </p>
            <p className="mt-1 text-base font-extrabold text-wizard-text">
              <span className="text-darkLimeGreen">
                {money0(totalGoalSavingsMonthly)}
              </span>{" "}
              <span className="text-xs font-semibold text-wizard-text/55">
                {t("perMonthSuffix")}
              </span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FooterSummary({
  incomeTotal,
  afterExpensesMonthly,
  afterExpensesAndSavingsMonthly,
  money0,
  t,
}: {
  incomeTotal: number;
  afterExpensesMonthly: number;
  afterExpensesAndSavingsMonthly: number;
  money0: (v: number) => string;
  t: <K extends keyof typeof subStepConfirmSavingsDict.sv>(k: K) => string;
}) {
  const afterSavings = afterExpensesAndSavingsMonthly;
  const ok = afterSavings >= 0;

  return (
    <div
      className="
        relative overflow-hidden rounded-3xl
        bg-wizard-shell/70 border border-wizard-stroke/25
        shadow-[0_10px_30px_rgba(2,6,23,0.10)]
        px-5 py-5 sm:px-6 sm:py-6
      "
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-wizard-text/55">
        {t("footerTitle")}
      </p>

      <div
        className="
          pointer-events-none select-none
          absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
        "
      >
        <WizardMascot src={SavingsBird} size={110} className="block" hello />
      </div>

      <div className="mt-4 space-y-2">
        <Row label={t("incomeLabel")} value={money0(incomeTotal)} />
        <Row
          label={t("afterExpensesLabel")}
          value={money0(afterExpensesMonthly)}
        />

        <div className="pt-3 mt-3 border-t border-wizard-stroke/20 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-wizard-text/80">
            {ok ? t("afterSavingsPositive") : t("afterSavingsNegative")}
          </span>

          <span
            className={`
              text-xl font-extrabold
              ${ok ? "text-wizard-accent" : "text-wizard-warning"}
            `}
          >
            {money0(Math.abs(afterSavings))}
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-wizard-text/65">{label}</span>
      <span className="font-semibold text-wizard-text tabular-nums">
        {value}
      </span>
    </div>
  );
}
