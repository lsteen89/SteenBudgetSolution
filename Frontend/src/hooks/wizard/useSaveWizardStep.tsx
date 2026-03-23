import { CODE_DATA_VERSION } from "@/constants/wizardVersion";
import { useWizardSaveQueue } from "@/stores/Wizard/wizardSaveQueue";
import { useToast } from "@/ui/toast/toast";
import { saveWizardStep } from "@api/Services/wizard/wizardService";
import { isAxiosError } from "axios";
import { useCallback } from "react";

type Options = {
  onValidationError?: (message: string) => void;
  onQueuedOffline?: () => void;
};

const useSaveWizardStep = (wizardSessionId: string, opts?: Options) => {
  const { showToast } = useToast();
  const enqueue = useWizardSaveQueue((s) => s.enqueue);

  const handleSaveStepData = useCallback(
    async (
      stepNumber: number,
      subStepNumber: number,
      dataToSave: any,
      goingBackwards: boolean,
    ): Promise<boolean> => {
      if (goingBackwards) return true;

      if (!wizardSessionId) {
        showToast("Ett anslutningsfel uppstod. Ladda om sidan.", "error");
        return false;
      }

      if (stepNumber == null) return false;

      try {
        await saveWizardStep(
          wizardSessionId,
          stepNumber,
          subStepNumber,
          dataToSave,
          CODE_DATA_VERSION,
        );
        return true;
      } catch (error: any) {
        if (isAxiosError(error)) {
          const code =
            (error as any)?.errorCode ?? error.response?.data?.error?.code;
          const message =
            error.response?.data?.error?.message ??
            error.message ??
            "Ogiltigt formulär";

          if (code === "Validation.Failed" || error.response?.status === 400) {
            opts?.onValidationError?.(message);
            return false;
          }

          if (!error.response) {
            enqueue({
              stepNumber,
              subStepNumber,
              data: dataToSave,
              goingBackwards,
            });

            opts?.onQueuedOffline?.();
            return true;
          }

          if (error.response.status === 401 || error.response.status === 403) {
            showToast("Din session har gått ut. Logga in igen.", "error");
            return false;
          }

          if (error.code === "ECONNABORTED") {
            enqueue({
              stepNumber,
              subStepNumber,
              data: dataToSave,
              goingBackwards,
            });

            opts?.onQueuedOffline?.();
            return true;
          }

          showToast(message || "Ett fel uppstod vid sparande.", "error");
          return false;
        }

        showToast("Ett oväntat fel inträffade.", "error");
        return false;
      }
    },
    [wizardSessionId, showToast, enqueue, opts],
  );

  return { handleSaveStepData };
};

export default useSaveWizardStep;
