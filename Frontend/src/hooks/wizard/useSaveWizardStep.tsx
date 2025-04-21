import { useState } from "react";
import { saveWizardStep } from "@api/Services/wizard/wizardService";

const useSaveWizardStep = (wizardSessionId: string, setWizardData: (data: any) => void) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveStepData = async (stepNumber: number, subStep: number, data: any, goingBackwards: boolean) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      console.log("useSaveWizardStep: Saving step data:", { stepNumber, subStep, data, goingBackwards });
      if(!goingBackwards)
      {
        await saveWizardStep(wizardSessionId, stepNumber, subStep, data);
      }
      // If going backwards, we skip the API call but still update local state
      // Merge partial data into local wizardData
      setWizardData((prev: any) => ({
        ...prev,
        [stepNumber]: {
          ...prev?.[stepNumber], // Keep existing data for this step
          ...data, // Merge in the new partial data
        },
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
