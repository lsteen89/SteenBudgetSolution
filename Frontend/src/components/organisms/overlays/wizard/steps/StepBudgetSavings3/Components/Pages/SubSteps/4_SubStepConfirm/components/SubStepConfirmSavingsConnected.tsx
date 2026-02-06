import React from "react";
import { WizardFinalizationPreviewGate } from "@/components/organisms/overlays/wizard/SharedComponents/Confirm/WizardFinalizationPreviewGate";
import SubStepConfirmSavings from "@/components/organisms/overlays/wizard/steps/StepBudgetSavings3/Components/Pages/SubSteps/4_SubStepConfirm/SubStepConfirmSavings";

export default function SubStepConfirmSavingsConnected() {
    console.log("[SavingsConfirmConnected] mounted");
    return (
        <WizardFinalizationPreviewGate>
            {(preview) => <SubStepConfirmSavings preview={preview} />}
        </WizardFinalizationPreviewGate>
    );
}
