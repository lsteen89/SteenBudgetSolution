import { useState, useEffect, useCallback, useRef } from "react";
import { startWizard, getWizardData } from "@api/Services/wizard/wizardService";
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';
import { useWizardDataStore, WizardData } from '@/stores/Wizard/wizardDataStore';
import { CODE_DATA_VERSION } from '@/constants/wizardVersion';
import { hasAnyWizardData } from '@/utils/wizard/wizardHelpers';
import { logAxiosError } from '@/api/axiosError';
import { set } from "lodash";



const useWizardInit = () => {
    const [loading, setLoading] = useState(true);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [connectionError, setConnectionError] = useState(false);
    const [initialSubStep, setInitialWizardSubStep] = useState<number | null>(null);
    const [initialMajorStep, setInitialWizardMajorStep] = useState<number | null>(null);
    const hydratedRef = useRef(false);

    const normalizeMaxSubByMajor = (m?: Record<number, number> | null) =>
        Object.fromEntries(
            Object.entries(m ?? {}).map(([k, v]) => [Number(k), Number(v ?? 0)])
        ) as Record<number, number>;

    const setMaxAllowed = useWizardSessionStore((s) => s.setMaxAllowed);
    const setMaxSubStepsByMajor = useWizardSessionStore((s) => s.setMaxSubStepsByMajor);
    const setSessionIdInStore = useWizardSessionStore((s) => s.setWizardSessionId);
    // We now use the wizardDataStore to manage our data
    const {
        localStoreVersion,
        resetDataStore,
        setIncome,
        setExpenditure,
        setSavings,
        setDebts,
        setIncomeReplace,
        setExpenditureReplace,
        setSavingsReplace,
        setDebtsReplace,
    } = useWizardDataStore(state => ({
        localStoreVersion: state.version,
        resetDataStore: state.reset,
        setIncome: state.setIncome,
        setExpenditure: state.setExpenditure,
        setSavings: state.setSavings,
        setDebts: state.setDebts,
        setIncomeReplace: state.setIncomeReplace,
        setExpenditureReplace: state.setExpenditureReplace,
        setSavingsReplace: state.setSavingsReplace,
        setDebtsReplace: state.setDebtsReplace,
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
                    const { wizardData: fetchedData, progress } = existingData;
                    console.log('%c📬 A pre-assembled book has arrived!', 'color: #0077be;', fetchedData);
                    console.log("SAVINGS FROM API", fetchedData.savings);
                    // Update Zustand store
                    if (fetchedData.income) setIncomeReplace(fetchedData.income);
                    if (fetchedData.expenditure) setExpenditureReplace(fetchedData.expenditure);
                    if (fetchedData.savings) setSavingsReplace(fetchedData.savings);
                    if (fetchedData.debts) setDebtsReplace(fetchedData.debts);
                    console.log('%c✅ The great ledger (Zustand) has been updated.', 'color: #228b22;');

                    const startMajor = progress?.majorStep ?? 0;
                    const startSub = progress?.subStep ?? 0;

                    setInitialWizardMajorStep(startMajor);
                    setInitialWizardSubStep(startSub);

                    const normalized = normalizeMaxSubByMajor(progress?.maxSubStepByMajor);
                    setMaxSubStepsByMajor(normalized);

                    const maxMajor = Math.max(0, ...Object.keys(normalized).map(Number), startMajor);
                    const maxSub = normalized[maxMajor] ?? startSub;
                    setMaxAllowed(maxMajor, maxSub);

                    // this is the key line for navigation gating
                    setMaxAllowed(startMajor, startSub);
                    setMaxSubStepsByMajor(progress?.maxSubStepByMajor ?? {});
                    console.log('%c🗺️ The journey begins here:', 'color: #20b2aa;', {
                        step: startMajor,
                        subStep: startSub,
                    });
                    console.log(`🗺️ Setting the journey start to Step ${startMajor}.`);
                } else {
                    console.log('📬 The book from the server was empty. Starting a new chronicle.');
                    setInitialWizardMajorStep(0);
                    setInitialWizardSubStep(0);
                    setMaxAllowed(0, 0);
                    setMaxSubStepsByMajor({});
                }
            } catch (error) {
                logAxiosError('🔥 A dark magic has interfered!', error);
                // Optionally, set an error state here for the UI
            } finally {
                setLoading(false);
            }
        };

        performInit();
    }, []); // Note: For production, you'd want to add your store setters to this dependency array.

    return { loading, failedAttempts, connectionError, initWizard, initialMajorStep, initialSubStep };
};

export default useWizardInit;