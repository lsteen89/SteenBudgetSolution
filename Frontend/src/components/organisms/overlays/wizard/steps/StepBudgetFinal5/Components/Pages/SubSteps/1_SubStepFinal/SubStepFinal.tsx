import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";
import { useCallback, useMemo, useState } from "react";

import {
  WizardAccordion,
  WizardAccordionRoot,
} from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";

import { useSubtleFireworks } from "@/hooks/effects/useSubtleFireworks";
import SubmitButton from "@components/atoms/buttons/SubmitButton";

import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";

import FinalVerdictCard from "@/components/pures/FinalVerdictCard";
import { mapFinalizationPreviewToFinalSummary } from "./Mapping/mapFinalizationPreviewToFinalSummary";

import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { subStepFinalDict } from "@/utils/i18n/wizard/stepFinal/SubStepFinal.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import CashflowBreakdown from "./components/CashflowBreakdown";
import HealthChips from "./components/HealthChips";
import DebtsReceiptPanel from "./components/Panel/DebtsReceiptPanel";
import ExpensesReceiptPanel from "./components/Panel/ExpensesReceiptPanel";
import IncomeReceiptPanel from "./components/Panel/IncomeReceiptPanel";
import SavingsReceiptPanel from "./components/Panel/SavingsReceiptPanel";

type Props = {
  preview?: BudgetDashboardDto;
  onFinalize: () => Promise<boolean>;
  isFinalizing: boolean;
  finalizationError: string | null;
  onFinalizeSuccess: () => void;

  onEditIncome: () => void;
  onEditExpenditure: () => void;
  onEditSavingsHabit: () => void;
  onEditSavingsGoals: () => void;
  onEditDebts: () => void;
};

export default function SubStepFinal({
  preview,
  onFinalize,
  isFinalizing,
  finalizationError,
  onFinalizeSuccess,
  onEditIncome,
  onEditExpenditure,
  onEditSavingsHabit,
  onEditSavingsGoals,
  onEditDebts,
}: Props) {
  const { fire } = useSubtleFireworks();
  const currency = useAppCurrency();
  const locale = useAppLocale();
  const [open, setOpen] = useState<string>("");

  const t = <K extends keyof typeof subStepFinalDict.sv>(k: K) =>
    tDict(k, locale, subStepFinalDict);

  const vm = useMemo(() => {
    if (!preview) return null;
    return mapFinalizationPreviewToFinalSummary(preview, locale, currency);
  }, [preview, locale, currency]);

  const money0 = useCallback(
    (v: number) =>
      formatMoneyV2(v ?? 0, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const handleFinalizeClick = useCallback(async () => {
    const ok = await onFinalize();
    if (!ok) return;
    fire();
    requestAnimationFrame(() => onFinalizeSuccess());
  }, [onFinalize, fire, onFinalizeSuccess]);

  const incomeMeta = t("sectionIncomeMetaTemplate")
    .replace("{sideHustles}", String(preview?.income?.sideHustles?.length ?? 0))
    .replace(
      "{households}",
      String(preview?.income?.householdMembers?.length ?? 0),
    );

  const expenditureMeta = t("sectionExpenditureMetaTemplate").replace(
    "{count}",
    String(preview?.expenditure?.byCategory?.length ?? 0),
  );

  const savingsMeta = t("sectionSavingsMetaTemplate")
    .replace("{habit}", money0(vm?.habitSavingsMonthly ?? 0))
    .replace("{goals}", String(preview?.savings?.goals?.length ?? 0));

  const debtsMeta = t("sectionDebtsMetaTemplate").replace(
    "{count}",
    String(preview?.debt?.debts?.length ?? 0),
  );

  if (!preview || !vm) {
    return (
      <div>
        <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe text-white space-y-6">
          <WizardStepHeader
            stepPill={{
              stepNumber: 5,
              majorLabel: t("pillMajor"),
              subLabel: t("pillSub"),
            }}
            title={t("titleSummary")}
            subtitle={t("subtitlePreviewMissing")}
            helpTitle={t("helpTitleCanFinish")}
            helpItems={[t("help1"), t("help2")]}
          />

          {finalizationError && (
            <p className="text-rose-300 text-sm">{finalizationError}</p>
          )}

          <FinalizeCta
            isFinalizing={isFinalizing}
            onFinalize={handleFinalizeClick}
            label={t("createBudget")}
            hint={t("finalizeHint")}
          />
        </section>
      </div>
    );
  }

  return (
    <div>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-6 relative">
        <WizardStepHeader
          stepPill={{
            stepNumber: 5,
            majorLabel: t("pillMajor"),
            subLabel: t("pillSub"),
          }}
          title={t("titleSummary")}
          subtitle={t("subtitleMain")}
        />

        <div className="space-y-4">
          <FinalVerdictCard
            balance={vm.finalBalance}
            currency={currency}
            kind={vm.verdict.kind}
            title={vm.verdict.title}
          />
          <WizardCard>
            <CashflowBreakdown ui={vm} money0={money0} />
          </WizardCard>
          <HealthChips chips={vm.healthChips} />
        </div>

        <WizardAccordionRoot
          type="single"
          collapsible
          value={open}
          onValueChange={setOpen}
        >
          <WizardAccordion
            value="income"
            isActive={open === "income"}
            title={
              <span className="text-wizard-text/90 text-base font-semibold">
                {t("sectionIncome")}
              </span>
            }
            subtitle={
              <div className="text-xs text-wizard-text/60">
                {t("sectionIncomeSubtitle")}
              </div>
            }
            meta={
              <div className="text-[11px] text-wizard-text/55 mt-0.5">
                {incomeMeta}
              </div>
            }
            totalText={money0(vm.totalIncome)}
            totalSuffix={t("perMonthSuffix")}
          >
            <IncomeReceiptPanel
              preview={preview}
              money0={money0}
              onEdit={onEditIncome}
            />
          </WizardAccordion>

          <WizardAccordion
            value="expenditure"
            isActive={open === "expenditure"}
            title={
              <span className="text-wizard-text text-base font-semibold">
                {t("sectionExpenditure")}
              </span>
            }
            subtitle={
              <div className="text-xs text-wizard-text/60">
                {t("sectionExpenditureSubtitle")}
              </div>
            }
            meta={
              <div className="mt-0.5 text-[11px] text-wizard-text/50">
                {expenditureMeta}
              </div>
            }
            totalText={money0(vm.totalExpenditure)}
            totalSuffix={t("perMonthSuffix")}
          >
            <ExpensesReceiptPanel
              preview={preview}
              money0={money0}
              onEdit={onEditExpenditure}
            />
          </WizardAccordion>

          <WizardAccordion
            value="savings"
            isActive={open === "savings"}
            title={
              <span className="text-wizard-text text-base font-semibold">
                {t("sectionSavings")}
              </span>
            }
            subtitle={
              <div className="text-xs text-wizard-text/60">
                {t("sectionSavingsSubtitle")}
              </div>
            }
            meta={
              <div className="mt-0.5 text-[11px] text-wizard-text/50">
                {savingsMeta}
              </div>
            }
            totalText={money0(vm.totalSavings)}
            totalSuffix={t("perMonthSuffix")}
          >
            <SavingsReceiptPanel
              preview={preview}
              money0={money0}
              onEditHabit={onEditSavingsHabit}
              onEditGoals={onEditSavingsGoals}
            />
          </WizardAccordion>

          <WizardAccordion
            value="debts"
            isActive={open === "debts"}
            title={
              <span className="text-wizard-text text-base font-semibold">
                {t("sectionDebts")}
              </span>
            }
            subtitle={
              <div className="text-xs text-wizard-text/60">
                {t("sectionDebtsSubtitle")}
              </div>
            }
            meta={
              <div className="mt-0.5 text-[11px] text-wizard-text/50">
                {debtsMeta}
              </div>
            }
            totalText={money0(vm.totalDebtPayments)}
            totalSuffix={t("perMonthSuffix")}
          >
            <DebtsReceiptPanel
              preview={preview}
              money0={money0}
              onEdit={onEditDebts}
            />
          </WizardAccordion>
        </WizardAccordionRoot>

        {finalizationError && (
          <p className="text-wizard-warning text-sm">{finalizationError}</p>
        )}

        <FinalizeCta
          isFinalizing={isFinalizing}
          onFinalize={handleFinalizeClick}
          label={t("createBudget")}
          hint={t("finalizeHint")}
        />
      </section>
    </div>
  );
}

function FinalizeCta(props: {
  isFinalizing: boolean;
  onFinalize: () => void;
  label: string;
  hint: string;
}) {
  const { isFinalizing, onFinalize, label, hint } = props;

  return (
    <div className="flex justify-center pt-2">
      <div className="w-full max-w-xl">
        <SubmitButton
          isSubmitting={isFinalizing}
          label={label}
          size="large"
          className="bg-darkLimeGreen text-darkBlueMenuColor w-full"
          enhanceOnHover
          onClick={onFinalize}
        />
        <p className="mt-2 text-center text-xs text-wizard-text/55">{hint}</p>
      </div>
    </div>
  );
}
