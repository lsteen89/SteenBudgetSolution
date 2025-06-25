import { useCallback } from 'react';
import { useToast } from '@context/ToastContext';
import { saveWizardStep } from '@api/Services/wizard/wizardService';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';

/**
 * A custom hook responsible for providing a stable, memoized function 
 * to save wizard step data to the backend. It does NOT modify local state directly,
 * leaving that responsibility to the calling component/hook.
 * * @param wizardSessionId - The active wizard session ID.
 * @returns An object containing the `handleSaveStepData` function.
 */
const useSaveWizardStep = (wizardSessionId: string) => {
  const { showToast } = useToast();

  const handleSaveStepData = useCallback(async (
    stepNumber: number,
    subStepNumber: number,
    dataToSave: any,
    goingBackwards: boolean
  ): Promise<boolean> => {

    // If we are navigating backwards, we don't need to save to the backend.
    // The parent component will handle updating the local state cache.
    if (goingBackwards) {
      return true; // Report success immediately without an API call.
    }
    
    // Safety Check 1: Don't attempt to save if the session ID isn't available.
    if (!wizardSessionId) {
      console.error("Save failed: wizardSessionId is not available.");
      showToast("Ett anslutningsfel uppstod. Ladda om sidan.", "error");
      return false;
    }
    
    // Safety Check 2: Prevent the "steps/undefined" error at the source.
    if (typeof stepNumber === 'undefined' || stepNumber === null) {
      console.error("Save failed: stepNumber is undefined or null.");
      return false;
    }

    try {
      console.log("useSaveWizardStep: Calling API to save step data:", { wizardSessionId, stepNumber, subStepNumber, dataToSave });
      
      // Call the actual API service function.
      await saveWizardStep(wizardSessionId, stepNumber, subStepNumber, dataToSave, CODE_DATA_VERSION);
      
      console.log(`Step ${stepNumber} / Sub-step ${subStepNumber} saved successfully to the backend.`);
      return true; // Return true on success

    } catch (error: any) {
      console.error(`Error saving data for step ${stepNumber}:`, error);
      showToast(
        `Ett fel uppstod när data skulle sparas: ${error.message || 'Okänt fel'}`, 
        "error"
      );
      return false; // Return false on failure
    }
  }, [wizardSessionId, showToast]); // Dependencies for useCallback

  // Note: We remove isSaving and saveError state. The parent component
  // (SetupWizard) already manages this with `transitionLoading` and `isSaving`.
  return { handleSaveStepData };
};

export default useSaveWizardStep;