import React from "react";
import { WizardFinalizationPreviewGate } from "@/components/organisms/overlays/wizard/SharedComponents/Confirm/WizardFinalizationPreviewGate";
import SubStepFinal from "@/components/organisms/overlays/wizard/steps/StepBudgetFinal5/Components/Pages/SubSteps/1_SubStepFinal/SubStepFinal";

export default function SubStepFinalConnected(props: {
    onFinalize: () => Promise<boolean>;
    isFinalizing: boolean;
    finalizationError: string | null;
    onFinalizeSuccess: () => void;

    onEditIncome: () => void;
    onEditExpenditure: () => void;
    onEditSavingsHabit: () => void;
    onEditSavingsGoals: () => void;
    onEditDebts: () => void;
}) {
    return (
        <WizardFinalizationPreviewGate>
            {(preview) => <SubStepFinal preview={preview} {...props} />}
        </WizardFinalizationPreviewGate>
    );
}
