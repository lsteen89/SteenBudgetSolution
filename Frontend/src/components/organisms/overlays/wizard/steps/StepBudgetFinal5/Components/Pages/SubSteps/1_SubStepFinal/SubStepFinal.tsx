import React, { useCallback, useMemo, useState } from "react";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import { WizardStepHeader } from "@components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepHeader";

import { WizardAccordionRoot, WizardAccordion } from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";

import { useSubtleFireworks } from "@/hooks/effects/useSubtleFireworks";
import SubmitButton from "@components/atoms/buttons/SubmitButton";

import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";

import FinalVerdictCard from "@/components/pures/FinalVerdictCard";

// Reuse confirm content
import SubStepConfirmDebts from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/SubStepConfirmDebts";
import SubStepConfirmSavings from "@/components/organisms/overlays/wizard/steps/StepBudgetSavings3/Components/Pages/SubSteps/4_SubStepConfirm/SubStepConfirmSavings";
// Expenditure confirm “page” component 
import SubStepConfirmExpenditure from "@/components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/8_SubStepConfirm/SubStepConfirmExpenditure";

// Local UI mapper for final verdict (tiny)
import { mapFinalizationPreviewToFinalSummary } from "./Mapping/mapFinalizationPreviewToFinalSummary";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import CoachBlock from "./components/CoachBlock";
import HealthChips from "./components/HealthChips";
import CashflowBreakdown from "./components/CashflowBreakdown";
import VerdictChip from "./components/VerdictChip";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import ExpensesReceiptPanel from "./components/Panel/ExpensesReceiptPanel";
import SavingsReceiptPanel from "./components/Panel/SavingsReceiptPanel";
import DebtsReceiptPanel from "./components/Panel/DebtsReceiptPanel"
import { asCategoryKey, labelCategory } from "@/utils/i18n/categories";
import IncomeReceiptPanel from "./components/Panel/IncomeReceiptPanel";
import { on } from "events";

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

  const vm = useMemo(() => {
    if (!preview) return null;
    return mapFinalizationPreviewToFinalSummary(preview, locale, currency);
  }, [preview, locale]);

  const money0 = useCallback(
    (v: number) => formatMoneyV2(v ?? 0, currency, locale, { fractionDigits: 0 }),
    [currency, locale]
  );

  const handleFinalizeClick = useCallback(async () => {
    const ok = await onFinalize();
    if (!ok) return;
    fire();
    requestAnimationFrame(() => onFinalizeSuccess());
  }, [onFinalize, fire, onFinalizeSuccess]);



  if (!preview || !vm) {
    return (
      <div>
        <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe text-white space-y-6">
          <WizardStepHeader
            stepPill={{ stepNumber: 5, majorLabel: "Bekräfta", subLabel: "Sammanfattning" }}
            title="Sammanfattning"
            subtitle="Vi kunde inte visa förhandsvisningen just nu."
            helpTitle="Du kan fortfarande slutföra"
            helpItems={[
              "Slutför guiden ändå — allt kan justeras efteråt.",
              "Om du vill se siffrorna: gå tillbaka och försök igen.",
            ]}
          />

          {finalizationError && (
            <p className="text-rose-300 text-sm">{finalizationError}</p>
          )}

          <FinalizeCta isFinalizing={isFinalizing} onFinalize={handleFinalizeClick} />
        </section>
      </div>
    );
  }

  return (
    <div>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-6 relative">
        <WizardStepHeader
          stepPill={{ stepNumber: 5, majorLabel: "Bekräfta", subLabel: "Sammanfattning" }}
          title="Sammanfattning"
          subtitle="En sista koll innan du skapar budgeten."
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



        <WizardAccordionRoot type="single" collapsible value={open} onValueChange={setOpen}>
          <WizardAccordion
            value="income"
            isActive={open === "income"}
            title={<span className="text-wizard-text/90 text-base font-semibold">Inkomster</span>}
            subtitle={<div className="text-xs text-wizard-text/60">Kontrollera källor och total</div>}
            meta={
              <div className="text-[11px] text-wizard-text/55 mt-0.5">
                {(preview.income?.sideHustles?.length ?? 0)} sidoinkomster • {(preview.income?.householdMembers?.length ?? 0)} hushåll
              </div>
            }
            totalText={money0(vm.totalIncome)}
            totalSuffix="/mån"
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
            title={<span className="text-wizard-text text-base font-semibold">Utgifter</span>}
            subtitle={<div className="text-xs text-wizard-text/60">Kontrollera kategorier och total</div>}
            meta={
              <div className="mt-0.5 text-[11px] text-wizard-text/50">
                {(preview.expenditure?.byCategory?.length ?? 0)} kategorier
              </div>
            }
            totalText={money0(vm.totalExpenditure)}
            totalSuffix="/mån"
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
            title={<span className="text-wizard-text text-base font-semibold">Sparande</span>}
            subtitle={<div className="text-xs text-wizard-text/60">Vanor och mål</div>}
            meta={
              <div className="mt-0.5 text-[11px] text-wizard-text/50">
                {money0(vm.habitSavingsMonthly)} vanor • {(preview.savings?.goals?.length ?? 0)} mål
              </div>
            }
            totalText={money0(vm.totalSavings)}
            totalSuffix="/mån"
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
            title={<span className="text-wizard-text text-base font-semibold">Skulder</span>}
            subtitle={<div className="text-xs text-wizard-text/60">Minimibetalningar</div>}
            meta={
              <div className="mt-0.5 text-[11px] text-wizard-text/50">
                {(preview.debt?.debts?.length ?? 0)} skulder
                {/* strategy label can live inside panel */}
              </div>
            }
            totalText={money0(vm.totalDebtPayments)}
            totalSuffix="/mån"
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

        <FinalizeCta isFinalizing={isFinalizing} onFinalize={handleFinalizeClick} />
      </section>
    </div>
  );
}

function FinalizeCta(props: { isFinalizing: boolean; onFinalize: () => void }) {
  const { isFinalizing, onFinalize } = props;
  return (
    <div className="flex justify-center pt-2">
      <div className="w-full max-w-xl">
        <SubmitButton
          isSubmitting={isFinalizing}
          label="Skapa budgeten"
          size="large"
          className="bg-darkLimeGreen text-darkBlueMenuColor w-full"
          enhanceOnHover
          onClick={onFinalize}
        />
        <p className="mt-2 text-center text-xs text-wizard-text/55">
          Kom ihåg: Du kan alltid justera din budget i efterhand, en budget är ett levande dokument.
        </p>
      </div>
    </div>
  );
}
