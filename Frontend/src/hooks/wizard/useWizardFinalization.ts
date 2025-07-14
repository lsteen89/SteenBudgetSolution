import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { completeWizard } from '@/api/Services/wizard/wizardService';
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';
import { useToast } from '@context/ToastContext';

/** Handles the POST /Wizard/{id}/complete flow */
export const useWizardFinalization = () => {
  const [isFinalizing, setIsFinalizing]       = useState(false);
  const [finalizationError, setError]         = useState<string | null>(null);

  const wizardSessionId = useWizardSessionStore(s => s.wizardSessionId);
  const navigate        = useNavigate();
  const { showToast }   = useToast();          // (msg, 'success' | 'error')

  const finalizeWizard = async (): Promise<void> => {
    if (!wizardSessionId) {
      const msg = 'Session ID is missing. Cannot complete the wizard.';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    setIsFinalizing(true);
    setError(null);

    try {
      await completeWizard(wizardSessionId);
      showToast('Budget created successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'An unexpected error occurred during finalization.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsFinalizing(false);
    }
  };

  return { finalizeWizard, isFinalizing, finalizationError: finalizationError };
};