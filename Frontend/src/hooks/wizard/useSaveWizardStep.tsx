import { useState } from "react";
import { saveWizardStep } from "@api/Services/wizard/wizardService";

const useSaveWizardStep = (wizardSessionId: string, setWizardData: (data: any) => void) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveStepData = async (stepNumber: number, subStep: number, data: any) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await saveWizardStep(wizardSessionId, stepNumber, subStep, data);

      // Merge partial data into local wizardData
      setWizardData((prev: any) => ({
        ...prev,
        [stepNumber]: data,
      }));

      return true; // Indicate success
    } catch (error) {
      console.error("Error saving wizard step:", error);
      setSaveError("Failed to save step data. Please try again.");
      return false; // Indicate failure
    } finally {
      setIsSaving(false);
    }
  };

  return { handleSaveStepData, isSaving, saveError };
};

export default useSaveWizardStep;
