import React from "react";
import { WizardFinalizationPreviewGate } from "@/components/organisms/overlays/wizard/SharedComponents/Confirm/WizardFinalizationPreviewGate";
import SubStepConfirmDebts from "@/components/organisms/overlays/wizard/steps/StepBudgetDebts4/Components/Pages/SubSteps/3_SubStepConfirm/SubStepConfirmDebts";

export default function SubStepConfirmDebtsConnected({
  onContinue,
}: {
  onContinue?: () => void;
}) {
  return (
    <WizardFinalizationPreviewGate>
      {(preview) => <SubStepConfirmDebts preview={preview} onContinue={onContinue} />}
    </WizardFinalizationPreviewGate>
  );
}
