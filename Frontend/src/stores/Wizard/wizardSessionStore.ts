import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WizardSessionStore {
  wizardSessionId: string | null;
  setWizardSessionId: (id: string) => void;
  clear: () => void;
}

export const useWizardSessionStore = create<WizardSessionStore>()(
  persist(
    (set) => ({
      wizardSessionId: null,
      setWizardSessionId: (id) => set({ wizardSessionId: id }),
      clear: () => set({ wizardSessionId: null }),
    }),
    {
      name: 'wizard-sessionId',                      // storage key
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ wizardSessionId: state.wizardSessionId }),
    }
  )
);
