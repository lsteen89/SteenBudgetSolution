import { useState, useEffect, useCallback } from "react";
import { startWizard, getWizardData } from "@api/Services/wizard/wizardService";
import { useToast } from "@context/ToastContext";
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';
import { useWizardDataStore, WizardData } from '@/stores/Wizard/wizardDataStore';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';

const useWizardInit = () => {
    const [loading, setLoading] = useState(true);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [connectionError, setConnectionError] = useState(false);
    const [initialSubStep, setInitialWizardSubStep] = useState<number | null>(null);
    const [wizardData, setWizardData] = useState<Partial<WizardData>>({});
    const [initialStep, setInitialStep] = useState(0);
    const { showToast } = useToast();

    const wizardSessionId = useWizardSessionStore(s => s.wizardSessionId);
    const setSessionIdInStore = useWizardSessionStore(s => s.setWizardSessionId);

    // Get the WHOLE CREW from the store. All the setters.
    const {
        localStoreVersion,
        resetDataStore,
        setIncome,
        setExpenditure,
        setSavings,
    } = useWizardDataStore(state => ({
        localStoreVersion: state.version,
        resetDataStore: state.reset,
        setIncome: state.setIncome,
        setExpenditure: state.setExpenditure,
        setSavings: state.setSavings,
    }));

    const initWizard = useCallback(async () => {
        setLoading(true);

        // First, check if the local book's STRUCTURE is old. If so, burn it.
        if (localStoreVersion < CODE_DATA_VERSION) {
            console.log(`Local store version (${localStoreVersion}) is outdated. Resetting to version ${CODE_DATA_VERSION}.`);
            resetDataStore();
        }

        if (failedAttempts >= 3) {
            // ... failure logic is fine ...
            setLoading(false);
            return;
        }

        try {
            const { wizardSessionId: fetchedWizardSessionId } = await startWizard();
            // ... session ID check is fine ...
            setSessionIdInStore(fetchedWizardSessionId);

            const existingResponse = await getWizardData(fetchedWizardSessionId).catch(() => null);

            if (existingResponse) {
                
                const { wizardData: fetchedDataForAllSteps, subStep } = existingResponse;
                
                setInitialWizardSubStep(subStep);

                if (fetchedDataForAllSteps && typeof fetchedDataForAllSteps === 'object' && Object.keys(fetchedDataForAllSteps).length > 0) {
                    
                    console.log("Hydrating entire Zustand store from backend data:", fetchedDataForAllSteps);

                    // If the backend sent income data, you update the income store.
                    if (fetchedDataForAllSteps.income) {
                        setIncome(fetchedDataForAllSteps.income);
                    }

                    // If the backend sent expenditure data, you update the expenditure store.
                    if (fetchedDataForAllSteps.expenditure) {
                        setExpenditure(fetchedDataForAllSteps.expenditure);
                    }

                    // If the backend sent savings data, you update the savings store.
                    if (fetchedDataForAllSteps.savings) {
                        setSavings(fetchedDataForAllSteps.savings);
                    }

                    // A smarter way to find the highest step completed.
                    let highestStep = 0;
                    if (fetchedDataForAllSteps.income) highestStep = 1;
                    if (fetchedDataForAllSteps.expenditure) highestStep = 2;
                    if (fetchedDataForAllSteps.savings) highestStep = 3;
                    setInitialStep(highestStep);

                } else {
                    setInitialStep(0);
                }
                
                setWizardData(fetchedDataForAllSteps || {});

            } else {
                // No data from server, start fresh.
                console.log("No existing wizard data on server for this session.");
                setWizardData({});
                setInitialStep(0);
                setInitialWizardSubStep(1);
            }

        } catch (error) {
            // ... error handling is fine ...
        } finally {
            setLoading(false);
        }
    }, [
        // Dependencies for useCallback
        failedAttempts,
        localStoreVersion,
        resetDataStore,
        setExpenditure,
        setIncome,
        setSavings,
        setSessionIdInStore,
        showToast,
    ]);

    useEffect(() => {
        initWizard();
    }, [initWizard]); // Pass the function itself as a dependency

    return {
        loading,
        failedAttempts,
        connectionError,
        wizardSessionId,
        wizardData,
        initWizard,
        initialStep,
        setWizardData,
        initialSubStep
    };
};

export default useWizardInit;