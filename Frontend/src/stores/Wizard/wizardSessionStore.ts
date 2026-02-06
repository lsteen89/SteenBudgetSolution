import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WizardSessionStore {
  wizardSessionId: string | null;

  // from backend (max allowed navigation point)
  maxMajorStepAllowed: number; // 0..5
  maxSubStepAllowed: number;   // 0..N (only meaningful when major matches current)

  // NEW: per-major max sub step map
  maxSubStepByMajor: Record<number, number>;
  setMaxSubStepsByMajor: (m: Record<number, number>) => void;

  setWizardSessionId: (id: string) => void;
  setMaxAllowed: (major: number, sub: number) => void;
  bumpEntitlement: (major: number, sub: number) => void;
  finalSummaryUnlocked: boolean;
  unlockFinalSummary: () => void;
  clear: () => void;
}

export const useWizardSessionStore = create<WizardSessionStore>()(
  persist(
    (set) => ({
      wizardSessionId: null,

      maxMajorStepAllowed: 0,
      maxSubStepAllowed: 0,

      // NEW
      maxSubStepByMajor: {},
      setMaxSubStepsByMajor: (m) => set({ maxSubStepByMajor: m ?? {} }),

      setWizardSessionId: (id) => set({ wizardSessionId: id }),

      setMaxAllowed: (major, sub) =>
        set({
          maxMajorStepAllowed: Math.max(0, major ?? 0),
          maxSubStepAllowed: Math.max(0, sub ?? 0),
        }),

      bumpEntitlement: (major, sub) =>
        set((state) => {
          const nextMap = { ...state.maxSubStepByMajor };
          const prev = nextMap[major] ?? 1;
          nextMap[major] = Math.max(prev, sub);

          // keep your existing maxMajor/maxSub consistent too
          const nextMaxMajor = Math.max(state.maxMajorStepAllowed, major);
          const nextMaxSub =
            nextMaxMajor === major ? Math.max(state.maxSubStepAllowed, sub) : state.maxSubStepAllowed;

          return {
            maxSubStepByMajor: nextMap,
            maxMajorStepAllowed: nextMaxMajor,
            maxSubStepAllowed: nextMaxSub,
          };
        }),
      finalSummaryUnlocked: false,

      unlockFinalSummary: () =>
        set((state) => ({
          finalSummaryUnlocked: true,
          // step 5 is now always clickable
          maxMajorStepAllowed: Math.max(state.maxMajorStepAllowed, 5),
        })),
      clear: () =>
        set({
          wizardSessionId: null,
          maxMajorStepAllowed: 0,
          maxSubStepAllowed: 0,
          // NEW
          maxSubStepByMajor: {},
        }),
    }),
    {
      name: "wizard-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        wizardSessionId: state.wizardSessionId,
        maxMajorStepAllowed: state.maxMajorStepAllowed,
        maxSubStepAllowed: state.maxSubStepAllowed,
        // NEW (persist it so reload keeps UI knowledge)
        maxSubStepByMajor: state.maxSubStepByMajor,
        finalSummaryUnlocked: state.finalSummaryUnlocked,
      }),
    }
  )
);
