import { useCallback } from 'react';
import { useToast } from '@context/ToastContext';
import { saveWizardStep } from '@api/Services/wizard/wizardService';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';
import { isAxiosError } from 'axios';

type Options = {
  onValidationError?: (message: string) => void; // <-- new
};



const useSaveWizardStep = (wizardSessionId: string, opts?: Options) => {
  const { showToast } = useToast();

  const handleSaveStepData = useCallback(async (
    stepNumber: number,
    subStepNumber: number,
    dataToSave: any,
    goingBackwards: boolean
  ): Promise<boolean> => {
    if (goingBackwards) return true;

    if (!wizardSessionId) {
      showToast('Ett anslutningsfel uppstod. Ladda om sidan.', 'error');
      return false;
    }
    if (stepNumber == null) return false;

    try {
      console.log('[HS] handleSaveStepData called', { stepNumber, subStepNumber, dataToSave });
      console.trace('[HS] trace');
      await saveWizardStep(wizardSessionId, stepNumber, subStepNumber, dataToSave, CODE_DATA_VERSION);
      return true;

    } catch (error: any) {
      // If server sent our envelope, Axios error was annotated in axios-wizard: (err as any).errorCode
      if (isAxiosError(error)) {
        const code = (error as any)?.errorCode ?? error.response?.data?.error?.code;
        const message = error.response?.data?.error?.message ?? error.message ?? 'Ogiltigt formulär';

        // --- Validation: show inline only, no toast ---
        if (code === 'Validation.Failed' || error.response?.status === 400) {
          opts?.onValidationError?.(message);
          return false;
        }

        // Non-validation errors → toast
        if (!error.response) {
          showToast('Nätverksfel. Kontrollera din anslutning.', 'error');
          return false;
        }
        if (error.response.status === 401 || error.response.status === 403) {
          showToast('Din session har gått ut. Logga in igen.', 'error');
          return false;
        }
        if (error.code === 'ECONNABORTED') {
          showToast('Begäran tog för lång tid. Försök igen.', 'error');
          return false;
        }

        showToast(message || 'Ett fel uppstod vid sparande.', 'error');
        return false;
      }

      showToast('Ett oväntat fel inträffade.', 'error');
      return false;
    }
  }, [wizardSessionId, showToast, opts]);

  return { handleSaveStepData };
};

export default useSaveWizardStep;
