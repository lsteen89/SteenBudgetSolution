import SubStepConfirmExpenditure from "../SubStepConfirmExpenditure";
import { WizardFinalizationPreviewGate } from "@/components/organisms/overlays/wizard/SharedComponents/Confirm/WizardFinalizationPreviewGate";

export default function SubStepConfirmExpenditureConnected() {
  return (
    <WizardFinalizationPreviewGate>
      {(preview) => <SubStepConfirmExpenditure preview={preview} />}
    </WizardFinalizationPreviewGate>
  );
}

