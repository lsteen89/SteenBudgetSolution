import { useMemo } from "react";
import { useWizardSessionStore } from "@/stores/Wizard/wizardSessionStore";

export function useStepEntitlement(majorStep: number, totalSubSteps: number) {
  const maxMajor = useWizardSessionStore((s) => s.maxMajorStepAllowed);
  const maxSub = useWizardSessionStore((s) => s.maxSubStepAllowed);
  const maxByMajor = useWizardSessionStore((s) => s.maxSubStepByMajor);

  return useMemo(() => {
    const maxFromMap = maxByMajor?.[majorStep] ?? 1; // 1 = overview

    const maxSubClickable =
      maxMajor > majorStep ? totalSubSteps :
        maxMajor === majorStep ? Math.max(1, maxSub || 1, maxFromMap) :
          1;



    return {
      maxMajor,
      maxSub,
      maxFromMap,
      maxSubClickable,
      entitledMaxSub: maxSubClickable,
      canClickSub: (dest: number) => dest <= maxSubClickable,
    };
  }, [maxMajor, maxSub, maxByMajor, majorStep, totalSubSteps]);
}
