import { completeWizard } from "@/api/Services/wizard/wizardService";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useAuthStore } from "@/stores/Auth/authStore";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { useWizardSessionStore } from "@/stores/Wizard/wizardSessionStore";
import { useToast } from "@/ui/toast/toast";
import { tDict } from "@/utils/i18n/translate";
import axios from "axios";
import { useState } from "react";

const wizardFinalizationDict = {
  sv: {
    success: "Budget färdigställd!",
    unexpectedError: "Ett oväntat fel inträffade under slutförandet.",
  },
  en: {
    success: "Budget created successfully!",
    unexpectedError: "An unexpected error occurred while finalizing.",
  },
  et: {
    success: "Eelarve on edukalt loodud!",
    unexpectedError: "Lõpetamisel ilmnes ootamatu viga.",
  },
} as const;

/** Handles the POST /Wizard/{id}/complete flow */
export const useWizardFinalization = () => {
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizationError, setError] = useState<string | null>(null);

  const wizardSessionId = useWizardSessionStore((s) => s.wizardSessionId);
  const { showToast } = useToast();
  const locale = useAppLocale();

  const t = <K extends keyof typeof wizardFinalizationDict.sv>(k: K) =>
    tDict(k, locale, wizardFinalizationDict);

  const finalizeWizard = async (): Promise<boolean> => {
    if (!wizardSessionId) return false;

    setIsFinalizing(true);
    setError(null);

    try {
      await completeWizard(wizardSessionId);

      useAuthStore.getState().markFirstLoginComplete();
      useWizardDataStore.getState().reset();
      useWizardSessionStore.getState().clear?.();

      showToast(t("success"), "success");
      return true;
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : t("unexpectedError");

      setError(msg);
      showToast(msg, "error");
      return false;
    } finally {
      setIsFinalizing(false);
    }
  };

  return { finalizeWizard, isFinalizing, finalizationError };
};
