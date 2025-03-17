import { useState, useEffect } from "react";
import { startWizard, getWizardData } from "@api/Services/wizard/wizardService";
import { useToast } from  "@context/ToastContext";



const useWizardInit = () => {
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  const [wizardSessionId, setWizardSessionId] = useState<string | null>(null);
  const [wizardData, setWizardData] = useState<any>({});
  const [initialStep, setInitialStep] = useState(0);
  const { showToast } = useToast();

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
      const { wizardSessionId, message } = await startWizard();
      console.log("startWizard response:", { wizardSessionId, message });
      if (!wizardSessionId) {
        setFailedAttempts(prev => prev + 1);
        showToast("🚨 Kontakt support – ingen session hämtad.", "error");
        setLoading(false);
        setConnectionError(true);
        return;
      }
      // Reset on success
      setFailedAttempts(0);
      setConnectionError(false);
      setWizardSessionId(wizardSessionId);
      // Fetch existing data (if any)
      const existingData = await getWizardData(wizardSessionId).catch(() => null);
      if (existingData) {
        // If it's an array, use it as before
        if (Array.isArray(existingData) && existingData.length > 0) {
            setInitialStep(existingData[0]);
        }        
        // If it's an object, extract the keys and determine the highest completed step
        else if (existingData && typeof existingData === "object") {
            const completedSteps = Object.keys(existingData)
            .map(k => parseInt(k, 10))
            .filter(k => !isNaN(k));
            if (completedSteps.length > 0) {
            const highestStep = Math.max(...completedSteps);
            setInitialStep(highestStep);
            }
        }


     }
      setWizardData(existingData || {});
      console.log("Existing wizard data:", existingData);
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

  return { loading, failedAttempts, connectionError, wizardSessionId, wizardData, initWizard, initialStep  };
};

export default useWizardInit;
