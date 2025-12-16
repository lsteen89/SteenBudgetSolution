import { useState } from 'react';
import axios from 'axios';
import { completeWizard } from '@/api/Services/wizard/wizardService';
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';
import { useToast } from '@context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/Auth/authStore';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { useBudgetDashboardStore } from '@/stores/Budget/budgetDashboardStore';

/** Handles the POST /Wizard/{id}/complete flow */
export const useWizardFinalization = () => {
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationError, setError] = useState<string | null>(null);

  const wizardSessionId = useWizardSessionStore(s => s.wizardSessionId);
  const { showToast } = useToast();

  const finalizeWizard = async (): Promise<boolean> => {
    if (!wizardSessionId) return false;

    setIsFinalizing(true);
    setError(null);

    try {
      await completeWizard(wizardSessionId);

      useAuthStore.getState().markFirstLoginComplete();
      useWizardDataStore.getState().reset();
      useWizardSessionStore.getState().clear?.();

      await useBudgetDashboardStore.getState().loadDashboard();

      showToast("Budget färdigställd!", "success");
      return true;
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Ett oväntat fel inträffade under slutförandet.";
      setError(msg);
      showToast(msg, "error");
      return false;
    } finally {
      setIsFinalizing(false);
    }
  };

  return { finalizeWizard, isFinalizing, finalizationError };
};
