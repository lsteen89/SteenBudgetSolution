import { logAxiosError } from "@/api/axiosError";
import { CODE_DATA_VERSION } from "@/constants/wizardVersion";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { useWizardSessionStore } from "@/stores/Wizard/wizardSessionStore";
import { getWizardData, startWizard } from "@api/Services/wizard/wizardService";
import { useCallback, useEffect, useState } from "react";

const useWizardInit = () => {
  const [loading, setLoading] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [initError, setInitError] = useState(false);
  const [initialSubStep, setInitialWizardSubStep] = useState<number | null>(
    null,
  );
  const [initialMajorStep, setInitialWizardMajorStep] = useState<number | null>(
    null,
  );

  const setMaxAllowed = useWizardSessionStore((s) => s.setMaxAllowed);
  const setMaxSubStepsByMajor = useWizardSessionStore(
    (s) => s.setMaxSubStepsByMajor,
  );
  const setSessionIdInStore = useWizardSessionStore(
    (s) => s.setWizardSessionId,
  );

  const {
    localStoreVersion,
    resetDataStore,
    setIncomeReplace,
    setExpenditureReplace,
    setSavingsReplace,
    setDebtsReplace,
  } = useWizardDataStore((state) => ({
    localStoreVersion: state.version,
    resetDataStore: state.reset,
    setIncomeReplace: state.setIncomeReplace,
    setExpenditureReplace: state.setExpenditureReplace,
    setSavingsReplace: state.setSavingsReplace,
    setDebtsReplace: state.setDebtsReplace,
  }));

  const normalizeMaxSubByMajor = (m?: Record<number, number> | null) =>
    Object.fromEntries(
      Object.entries(m ?? {}).map(([k, v]) => [Number(k), Number(v ?? 0)]),
    ) as Record<number, number>;

  const initWizard = useCallback(async () => {
    setLoading(true);

    try {
      if (localStoreVersion < CODE_DATA_VERSION) {
        resetDataStore();
      }

      const startResponse = await startWizard();
      const fetchedWizardSessionId = startResponse.wizardSessionId;

      if (!fetchedWizardSessionId) {
        throw new Error("Failed to retrieve a wizard session ID.");
      }

      setSessionIdInStore(fetchedWizardSessionId);

      const existingData = await getWizardData(fetchedWizardSessionId);

      if (existingData?.wizardData) {
        const { wizardData: fetchedData, progress } = existingData;

        if (fetchedData.income) setIncomeReplace(fetchedData.income);
        if (fetchedData.expenditure)
          setExpenditureReplace(fetchedData.expenditure);
        if (fetchedData.savings) setSavingsReplace(fetchedData.savings);
        if (fetchedData.debts) setDebtsReplace(fetchedData.debts);

        const startMajor = progress?.majorStep ?? 0;
        const startSub = progress?.subStep ?? 0;

        setInitialWizardMajorStep(startMajor);
        setInitialWizardSubStep(startSub);

        const normalized = normalizeMaxSubByMajor(progress?.maxSubStepByMajor);
        setMaxSubStepsByMajor(normalized);
        setMaxAllowed(startMajor, startSub);
      } else {
        setInitialWizardMajorStep(0);
        setInitialWizardSubStep(0);
        setMaxAllowed(0, 0);
        setMaxSubStepsByMajor({});
      }

      setInitError(false);
      setFailedAttempts(0);
    } catch (error) {
      logAxiosError("Wizard init failed", error);
      setInitError(true);
      setFailedAttempts((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }, [
    localStoreVersion,
    resetDataStore,
    setSessionIdInStore,
    setIncomeReplace,
    setExpenditureReplace,
    setSavingsReplace,
    setDebtsReplace,
    setMaxAllowed,
    setMaxSubStepsByMajor,
  ]);

  useEffect(() => {
    void initWizard();
  }, [initWizard]);

  return {
    loading,
    failedAttempts,
    initError,
    initWizard,
    initialMajorStep,
    initialSubStep,
  };
};

export default useWizardInit;
