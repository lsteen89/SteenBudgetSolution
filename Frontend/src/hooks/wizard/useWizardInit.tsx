import { useState, useEffect } from "react";
import { startWizard, getWizardData } from "@api/Services/wizard/wizardService";
import { useToast } from  "@context/ToastContext";
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';


const useWizardInit = () => {
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  const [initialSubStep, setInitialWizardSubStep] = useState<number | null>(null);
  const [wizardData, setWizardData] = useState<any>({});
  const [initialStep, setInitialStep] = useState(0);
  const { showToast } = useToast();

  const wizardSessionId = useWizardSessionStore(s => s.wizardSessionId);
  const setSessionId    = useWizardSessionStore(s => s.setWizardSessionId);

  const initWizard = async () => {
    setLoading(true);
    if (failedAttempts >= 3) {
      if (failedAttempts === 3) {
        showToast("🚨 Kontakt support – för många misslyckade försök.", "error");
      }
      setLoading(false);
      return;
    }
    try {
      const { wizardSessionId: fetchedWizardSessionId } = await startWizard();
      if (!fetchedWizardSessionId) {
        setFailedAttempts(prev => prev + 1);
        showToast("🚨 Kontakt support – ingen session hämtad.", "error");
        setLoading(false);
        setConnectionError(true);
        return;
      }
      // Reset on success
      setFailedAttempts(0);
      setConnectionError(false);
      setSessionId(fetchedWizardSessionId);

      const existingResponse = await getWizardData(fetchedWizardSessionId).catch(() => null);
      if (existingResponse) {
        const { wizardData: fetchedWizardData, subStep } = existingResponse;

        // Set the wizard sub step state
        setInitialWizardSubStep(subStep);
        // If it's an array, use it as before
        if (fetchedWizardData) {
          // If it's an array, use it as before
          if (Array.isArray(fetchedWizardData) && fetchedWizardData.length > 0) {
            setInitialStep(fetchedWizardData[0]);
          }    
                
          // If it's an object, extract the keys and determine the highest completed step
          else if (fetchedWizardData  && typeof fetchedWizardData  === "object") {
              const completedSteps = Object.keys(fetchedWizardData )
              .map(k => parseInt(k, 10))
              .filter(k => !isNaN(k));
              if (completedSteps.length > 0) {
              const highestStep = Math.max(...completedSteps);
              setInitialStep(highestStep);
              }
          }


        }
        setWizardData(fetchedWizardData  || {});
      }
      if (failedAttempts > 0) {
        showToast("Anslutning lyckades!", "success");
      }
    } catch (error) {
      console.error("Error in initWizard:", error);
      setFailedAttempts(prev => prev + 1);
      showToast("🚨 Ett fel uppstod – försök igen eller kontakta support.", "error");
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  };

  // Runs every time the component mounts
  useEffect(() => {
    initWizard();
  }, []); // Empty dependency array ensures it runs on every mount
  return { loading, failedAttempts, connectionError, wizardSessionId, wizardData, initWizard, initialStep, setWizardData, initialSubStep  };
};

export default useWizardInit;
