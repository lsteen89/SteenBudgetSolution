import { motion } from "framer-motion";
import React, { useMemo, useState } from "react";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import useMediaQuery from "@/hooks/useMediaQuery";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";

import bird from "@/assets/Images/GuideBirdReward.png";
import { WizardMascot } from "@/components/atoms/animation/WizardMascot";
import SummaryDoughnut from "@/components/atoms/charts/SummaryDoughnut";
import {
  WizardAccordion,
  WizardAccordionRoot,
} from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import { cn } from "@/lib/utils";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import type { CategoryKey } from "@/utils/i18n/budget/categories";
import { asCategoryKey } from "@/utils/i18n/budget/categories";
import { tDict } from "@/utils/i18n/translate";
import { confirmExpenditureDict } from "@/utils/i18n/wizard/stepExpenditure/confirmExpenditureDict.i18n";
import { mapFinalizationPreviewToExpenseConfirm } from "./mapping/mapFinalizationPreviewToExpenseConfirm";

type Props = {
  preview?: BudgetDashboardDto;
};

const SubStepConfirmExpenditure: React.FC<Props> = ({ preview }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const t = <K extends keyof typeof confirmExpenditureDict.sv>(k: K) =>
    tDict(k, locale, confirmExpenditureDict);

  const money0 = (v: number) =>
    formatMoneyV2(v ?? 0, currency, locale, { fractionDigits: 0 });

  const pctOf = (v: number, total: number) =>
    total > 0 ? Math.round((v / total) * 100) : 0;

  const vm = useMemo(() => {
    if (!preview) return null;
    return mapFinalizationPreviewToExpenseConfirm(preview, locale);
  }, [preview, locale]);

  if (!preview || !vm) {
    return (
      <div>
        <section className="mx-auto w-auto space-y-6 py-8 pb-safe text-wizard-text sm:px-6 lg:px-12">
          <WizardStepHeader
            title={t("title")}
            subtitle={t("missingPreviewSubtitle")}
            helpTitle={t("missingPreviewHelpTitle")}
            helpItems={[t("missingPreviewHelp1"), t("missingPreviewHelp2")]}
          />

          <div className="rounded-2xl border border-wizard-stroke/20 bg-wizard-surface p-4 text-sm text-wizard-text/70 shadow-sm shadow-black/5">
            {t("missingPreviewNote")}
          </div>
        </section>
      </div>
    );
  }

  const slices = vm.categories.map((c) => ({
    key: c.key,
    label: c.title,
    value: c.total,
  }));

  return (
    <div>
      <section className="mx-auto w-auto space-y-6 pb-safe sm:px-6 lg:px-12">
        <WizardStepHeader
          stepPill={{
            stepNumber: 2,
            majorLabel: t("stepMajor"),
            subLabel: t("stepSub"),
          }}
          title={t("title")}
          subtitle={t("lead")}
        />

        {vm.categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-2"
          >
            <div className="rounded-2xl border border-wizard-stroke/20 shadow-sm shadow-black/5 px-4 py-4">
              <div className="relative">
                {/* Bird: always visible (mobile centered, desktop absolute left) */}
                <div className="sm:hidden flex justify-center pointer-events-none select-none pb-2">
                  <WizardMascot
                    src={bird}
                    size={120}
                    showText={false}
                    hello
                    float
                    tilt
                  />
                </div>

                <div className="hidden sm:block pointer-events-none select-none absolute left-4 top-1/2 -translate-y-1/2">
                  <WizardMascot
                    src={bird}
                    size={240}
                    className="sm:scale-150 lg:scale-105"
                    showText={false}
                    hello
                    float
                    tilt
                  />
                </div>

                {/* Donut: desktop only, centered, height-capped so card isn't huge */}
                {isDesktop && (
                  <div className="flex justify-center">
                    <div className="w-full max-w-[560px]">
                      <div className="mx-auto aspect-square h-[clamp(260px,40vh,420px)]">
                        <SummaryDoughnut
                          slices={slices}
                          selectedKey={openCategory}
                          onSliceClick={setOpenCategory}
                          formatMoney={money0}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isDesktop && (
                <p className="mt-2 text-center text-xs text-wizard-text/65">
                  {t("donutHint")}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {vm.categories.length === 0 ? (
          <div className="rounded-2xl border border-wizard-stroke/20 bg-wizard-surface p-4 text-center text-sm text-wizard-text/70 shadow-sm shadow-black/5">
            {t("empty")}
          </div>
        ) : (
          <WizardAccordionRoot
            type="single"
            collapsible
            value={openCategory ?? ""}
            onValueChange={(v) => setOpenCategory(v ? asCategoryKey(v) : null)}
          >
            {vm.categories.map((c) => {
              const pct = pctOf(c.total, vm.grandTotal);

              return (
                <WizardAccordion
                  key={c.key}
                  value={c.key}
                  isActive={openCategory === c.key}
                  title={c.title}
                  totalText={`${money0(c.total)} (${pct} %)`}
                  totalSuffix={t("perMonth")}
                  variant="shell"
                  subtitle={
                    <div className="h-2 w-full rounded-full bg-wizard-stroke/15">
                      <div
                        className="h-2 rounded-full bg-wizard-accent"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  }
                >
                  <ul className="space-y-0">
                    {c.items.map((x) => (
                      <li
                        key={x.title}
                        className="
                          grid w-full grid-cols-1 gap-y-1 py-2
                          sm:grid-cols-[1fr_auto]
                          border-b border-wizard-stroke/15
                        "
                      >
                        <span className="truncate text-wizard-text/80">
                          {x.title}
                        </span>
                        <span className="font-mono font-semibold text-wizard-text sm:text-right">
                          {money0(x.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </WizardAccordion>
              );
            })}
          </WizardAccordionRoot>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-wizard-stroke/20 bg-wizard-shell p-4 text-sm text-wizard-text/70 shadow-sm shadow-black/5"
        >
          {t("advice")}
        </motion.div>

        {/* Bottom summary (structured, calm) */}
        <div className="rounded-2xl border bg-wizard-shell/80 border-wizard-strokeStrong/25 p-5 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-semibold text-wizard-text/70">
                {t("income")}
              </span>
              <span className="text-lg font-extrabold text-wizard-text">
                {money0(vm.incomeTotal)}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-semibold text-wizard-text/70">
                {t("expenses")}
              </span>
              <span className="text-lg font-extrabold text-wizard-text/80">
                {money0(vm.grandTotal)}
              </span>
            </div>

            <div className="mt-2 h-px w-full bg-wizard-stroke/20" />

            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-semibold text-wizard-text/70">
                {vm.remaining >= 0 ? t("remaining") : t("deficit")}
              </span>

              <span
                className={cn(
                  "text-xl font-extrabold",
                  vm.remaining >= 0
                    ? "text-darkLimeGreen"
                    : "text-wizard-warning",
                )}
              >
                {money0(Math.abs(vm.remaining))}
              </span>
            </div>

            {vm.remaining < 0 ? (
              <p className="mt-1 text-xs text-wizard-warning/80">
                {t("deficitHint")}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SubStepConfirmExpenditure;
