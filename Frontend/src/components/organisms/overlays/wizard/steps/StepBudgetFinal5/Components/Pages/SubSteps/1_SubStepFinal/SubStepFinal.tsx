import React from "react";
import { Coins, Home, Sprout, Scale } from "lucide-react";

import FinalVerdictCard from "@/components/pures/FinalVerdictCard";
import SummaryPillarCard from "@/components/pures/SummaryPillarCard";
import { SummaryGrid } from "./SummaryGrid";
import SubmitButton from "@components/atoms/buttons/SubmitButton";
import DetailedLedger from "@/components/organisms/summaries/DetailedLedger";
import { useSubtleFireworks } from "@/hooks/effects/useSubtleFireworks";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWizardFinalPreviewUi } from "@/components/organisms/overlays/wizard/steps/StepBudgetFinal5/Hooks/useWizardFinalPreviewUi";
import { useAppCurrency, useAppLocale } from "@/hooks/i18n/useAppCurrency";

interface SubStepFinalProps {
  onFinalize: () => Promise<boolean>;
  isFinalizing: boolean;
  finalizationError: string | null;
  onFinalizeSuccess: () => void;
}

type FinalState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; ui: NonNullable<ReturnType<typeof useWizardFinalPreviewUi>["ui"]>; preview: BudgetDashboardDto };

const SubStepFinal: React.FC<SubStepFinalProps> = ({
  onFinalize,
  isFinalizing,
  finalizationError,
  onFinalizeSuccess,
}) => {
  const { fire } = useSubtleFireworks();
  const { query, ui } = useWizardFinalPreviewUi();





  const handleFinalizeClick = React.useCallback(async () => {
    const ok = await onFinalize();
    if (!ok) return;
    fire();
    requestAnimationFrame(() => onFinalizeSuccess());
  }, [onFinalize, fire, onFinalizeSuccess]);

  const state: FinalState = React.useMemo(() => {
    if (query.isLoading) return { kind: "loading" };
    if (query.isError || !ui) return { kind: "error" };
    return { kind: "ready", ui, preview: query.data! };
  }, [query.isLoading, query.isError, ui]);

  return (
    <PageShell>
      {state.kind === "loading" && <LoadingSkeleton />}

      {state.kind === "error" && (
        <ErrorState
          finalizationError={finalizationError}
          isFinalizing={isFinalizing}
          onFinalize={handleFinalizeClick}
        />
      )}

      {state.kind === "ready" && (
        <ReadyState
          ui={state.ui}
          preview={state.preview}
          finalizationError={finalizationError}
          isFinalizing={isFinalizing}
          onFinalize={handleFinalizeClick}
        />
      )}
    </PageShell>
  );
};

export default SubStepFinal;

// -------------------------
// layout + states
// -------------------------

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="p-4 md:p-8 min-h-screen w-full">{children}</div>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

function ErrorState(props: {
  finalizationError: string | null;
  isFinalizing: boolean;
  onFinalize: () => void;
}) {
  const { finalizationError, isFinalizing, onFinalize } = props;

  return (
    <>
      <div className="rounded-2xl p-4 bg-white/60">
        <p className="font-semibold text-gray-800">Kunde inte hämta förhandsvisningen.</p>
        <p className="text-sm text-gray-600 mt-2">
          Du kan fortfarande slutföra guiden, men siffrorna kan inte visas just nu.
        </p>
      </div>

      {finalizationError && <p className="text-red-600 text-center my-4">{finalizationError}</p>}

      <div className="mt-6">
        <FinalizeCta isFinalizing={isFinalizing} onFinalize={onFinalize} />
      </div>
    </>
  );
}
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
function ReadyState(props: {
  ui: any;
  preview: BudgetDashboardDto;
  finalizationError: string | null;
  isFinalizing: boolean;
  onFinalize: () => void;
}) {
  const { ui, preview, finalizationError, isFinalizing, onFinalize } = props;
  const currency = useAppCurrency();
  const locale = useAppLocale();
  return (
    <div className="space-y-12">
      <div className="mb-6">
        <SummaryGrid title="Per månad" topRows={ui.breakdownRows} rows={ui.categoryRows} currency={currency} locale={locale} />
      </div>

      <FinalVerdictCard balance={ui.finalBalance} currency={currency} locale={locale} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <SummaryPillarCard icon={Coins} title="Inkomster" amount={ui.totalIncome} description={ui.pillarDescriptions.income} currency={currency} locale={locale} />
        <SummaryPillarCard icon={Home} title="Utgifter" amount={ui.totalExpenditure} description={ui.pillarDescriptions.expenditure} currency={currency} locale={locale} />
        <SummaryPillarCard icon={Sprout} title="Sparande" amount={ui.totalSavings} description={ui.pillarDescriptions.savings} currency={currency} locale={locale} />
        <SummaryPillarCard icon={Scale} title="Skulder" amount={ui.totalDebtPayments} description={ui.pillarDescriptions.debts} currency={currency} locale={locale} />
      </div>

      {/* Still FE-based today; later feed it from preview dto */}
      <DetailedLedger preview={preview} />

      {finalizationError && <p className="text-red-600 text-center my-4">{finalizationError}</p>}

      <FinalizeCta isFinalizing={isFinalizing} onFinalize={onFinalize} />
    </div>
  );
}

function FinalizeCta(props: { isFinalizing: boolean; onFinalize: () => void }) {
  const { isFinalizing, onFinalize } = props;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-xl">
        <SubmitButton
          isSubmitting={isFinalizing}
          label="Skapa din budget!"
          size="large"
          className="bg-darkLimeGreen text-darkBlueMenuColor w-full"
          enhanceOnHover
          onClick={onFinalize}
        />
      </div>
    </div>
  );
}
