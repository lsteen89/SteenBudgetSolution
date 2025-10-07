import { useState, useEffect, useCallback, useRef } from "react";
import { startWizard, getWizardData } from "@api/Services/wizard/wizardService";
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';
import { useWizardDataStore, WizardData } from '@/stores/Wizard/wizardDataStore';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';
import { hasAnyWizardData } from '@/utils/wizard/wizardHelpers';

// This is the shape of the satchel we expect from the backend
interface ApiStepData {
    stepNumber: number;
    subStep: number;
    stepData: string; // The data is a JSON string from the database
}

interface WizardApiResponse {
    wizardSteps: ApiStepData[];
    // We can derive the highest sub-step if needed, or get it from the API
}



const useWizardInit = () => {
    const [loading, setLoading] = useState(true);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [connectionError, setConnectionError] = useState(false);
    const [initialSubStep, setInitialWizardSubStep] = useState<number | null>(null);
    const [initialStep, setInitialStep] = useState(0);
    const hydratedRef = useRef(false);

    const setSessionIdInStore = useWizardSessionStore(s => s.setWizardSessionId);
    // We now use the wizardDataStore to manage our data
    const {
        localStoreVersion,
        resetDataStore,
        setIncome,
        setExpenditure,
        setSavings,
        setDebts,
    } = useWizardDataStore(state => ({
        localStoreVersion: state.version,
        resetDataStore: state.reset,
        setIncome: state.setIncome,
        setExpenditure: state.setExpenditure,
        setSavings: state.setSavings,
        setDebts: state.setDebts,
    }));

    const initWizard = useCallback(async () => { }, []);

    useEffect(() => {
        const performInit = async () => {
            console.log('%c🧙‍♂️ The Wizard awakens! Beginning the initialization sequence...', 'color: #8a2be2;');
            setLoading(true);

            if (localStoreVersion < CODE_DATA_VERSION) {
                console.log(`%c📜 An old scroll was found! Resetting...`, 'color: #ff8c00;');
                resetDataStore();
            }

            try {
                if (localStoreVersion < CODE_DATA_VERSION) {
                    console.log(`%c📜 An old scroll was found! Resetting...`, 'color: #ff8c00;');
                    resetDataStore();
                }

                // 1. Start the session and get the ID
                const startResponse = await startWizard();
                const fetchedWizardSessionId = startResponse.wizardSessionId;

                if (!fetchedWizardSessionId) {
                    throw new Error("Failed to retrieve a wizard session ID.");
                }

                setSessionIdInStore(fetchedWizardSessionId);
                console.log(`%c🔑 A key to the tower has been forged:`, 'color: #4682b4;', fetchedWizardSessionId);

                // 2. Fetch existing data using the new ID
                const existingData = await getWizardData(fetchedWizardSessionId);

                // 3. Process the data
                if (existingData && existingData.wizardData) {
                    const { wizardData: fetchedData, subStep } = existingData;
                    console.log('%c📬 A pre-assembled book has arrived!', 'color: #0077be;', fetchedData);

                    // Update Zustand store
                    if (fetchedData.income) setIncome(fetchedData.income);
                    if (fetchedData.expenditure) setExpenditure(fetchedData.expenditure);
                    if (fetchedData.savings) setSavings(fetchedData.savings);
                    if (fetchedData.debts) setDebts(fetchedData.debts);
                    console.log('%c✅ The great ledger (Zustand) has been updated.', 'color: #228b22;');

                    // Determine starting step
                    let highestStep = 0;
                    if (fetchedData.income) highestStep = 1;
                    if (fetchedData.expenditure) highestStep = 2;
                    if (fetchedData.savings) highestStep = 3;
                    if (fetchedData.debts) highestStep = 4;

                    setInitialStep(highestStep);
                    setInitialWizardSubStep(subStep);
                    console.log('%c🗺️ The journey begins here:', 'color: #20b2aa;', { step: highestStep, subStep });
                    console.log(`🗺️ Setting the journey start to Step ${highestStep}.`);
                } else {
                    console.log('📬 The book from the server was empty. Starting a new chronicle.');
                    setInitialStep(0);
                }
            } catch (error) {
                console.error('🔥 A dark magic has interfered!', error);
                // Optionally, set an error state here for the UI
            } finally {
                setLoading(false);
            }
        };

        performInit();
    }, []); // Note: For production, you'd want to add your store setters to this dependency array.

    return { loading, failedAttempts, connectionError, initWizard, initialStep, initialSubStep };
};

export default useWizardInit;