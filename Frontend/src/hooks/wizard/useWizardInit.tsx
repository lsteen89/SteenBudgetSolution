import { useState, useEffect } from "react";
import { startWizard, getWizardData } from "@api/Services/wizard/wizardService";
import { useToast } from "@context/ToastContext";
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { IncomeFormValues } from '@myTypes/Wizard/IncomeFormValues';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';

const useWizardInit = () => {
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  const [initialSubStep, setInitialWizardSubStep] = useState<number | null>(null);
  const [wizardData, setWizardData] = useState<any>({}); // Local state for all wizard data
  const [initialStep, setInitialStep] = useState(0);
  const { showToast } = useToast();

  const wizardSessionId = useWizardSessionStore(s => s.wizardSessionId);
  const setSessionIdInStore = useWizardSessionStore(s => s.setWizardSessionId);

  // Get the setter for the 'income' slice from your wizard data store
  const setIncomeDataInStore = useWizardDataStore(s => s.setIncome);
  const localStoreVersion = useWizardDataStore(s => s.version);
  const resetDataStore = useWizardDataStore(s => s.reset);

  const initWizard = async () => {
    setLoading(true);
    if (localStoreVersion < CODE_DATA_VERSION) {
      console.log(`Local store version (${localStoreVersion}) is outdated. Resetting.`);
      resetDataStore();
    }
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
      
      setFailedAttempts(0);
      setConnectionError(false);
      setSessionIdInStore(fetchedWizardSessionId);

      const existingResponse = await getWizardData(fetchedWizardSessionId).catch(() => null);
      
      if (existingResponse) {
        const { wizardData: fetchedDataForAllSteps, subStep } = existingResponse;

        setInitialWizardSubStep(subStep);
        
        if (fetchedDataForAllSteps && typeof fetchedDataForAllSteps === "object" && Object.keys(fetchedDataForAllSteps).length > 0) {
          const completedSteps = Object.keys(fetchedDataForAllSteps)
            .map(k => parseInt(k, 10))
            .filter(k => !isNaN(k));

          if (completedSteps.length > 0) {
            const highestStep = Math.max(...completedSteps);
            setInitialStep(highestStep);
          } else {
            setInitialStep(0); // Default if no numeric step keys found
          }

          // --- HYDRATE ZUSTAND STORE FOR STEP 1 ---
          const step1Data = fetchedDataForAllSteps['1'] as IncomeFormValues | undefined;
          if (step1Data && Object.keys(step1Data).length > 0) {
            console.log("useWizardInit: Populating Zustand store with Step 1 data:", step1Data);
            setIncomeDataInStore(step1Data); 
          } else {
            console.log("useWizardInit: No meaningful Step 1 data in fetched response or '1' key missing/empty.");
            // Optional: If your store needs explicit reset to defaults when no Step 1 data is fetched.
            // const defaultIncomeValues = useWizardDataStore.getState().getDefaultIncomeValues(); // Example
            // setIncomeDataInStore(defaultIncomeValues);
          }
        } else {
          // fetchedDataForAllSteps is null, undefined, or not a non-empty object
          console.log("useWizardInit: Fetched wizard data is empty or not in the expected object format.");
          setInitialStep(0); // Reset to default initial step
           // Optional: Reset income store to defaults
          // const defaultIncomeValues = useWizardDataStore.getState().getDefaultIncomeValues(); // Example
          // setIncomeDataInStore(defaultIncomeValues);
        }
        // Set the local state with all fetched data (or empty object if null/undefined)
        setWizardData(fetchedDataForAllSteps || {});
      } else {
        // No existingResponse from getWizardData (e.g., new user, or API error already caught)
        console.log("useWizardInit: No existing wizard data response from server.");
        setWizardData({}); // Reset local state
        setInitialStep(0);
        setInitialWizardSubStep(null); // Or your desired default, e.g., 1
        // Optional: Reset income store to defaults
        // const defaultIncomeValues = useWizardDataStore.getState().getDefaultIncomeValues(); // Example
        // setIncomeDataInStore(defaultIncomeValues);
      }

      if (failedAttempts > 0 && !connectionError) { // Only show success if there were previous fails but now connected
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

  useEffect(() => {
    initWizard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs on mount

  return { 
    loading, 
    failedAttempts, 
    connectionError, 
    wizardSessionId,
    wizardData, // This is the local state containing all fetched data
    initWizard, 
    initialStep, 
    setWizardData, // Setter for the local state
    initialSubStep 
  };
};

export default useWizardInit;