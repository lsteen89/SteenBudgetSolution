import { useWizardSaveQueue } from "@/stores/Wizard/wizardSaveQueue";
import { useToast } from "@/ui/toast/toast";
import { isWizardProfilerEnabled } from "@/utils/profiling/wizardProfiler";
import { useCallback } from "react";
import { FieldValues, Path, UseFormReturn } from "react-hook-form";
import * as yup from "yup";

// --- (1) The generic constraint  FieldValues ---
interface UseSaveStepDataProps<T extends FieldValues> {
  stepNumber: number;
  methods?: UseFormReturn<T>;
  isMobile: boolean;
  onSaveStepData: (
    stepNumber: number,
    subStepNumber: number,
    data: Partial<T>,
    goingBackwards: boolean,
  ) => Promise<boolean>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  onError?: () => void;

  getPartialDataForSubstep: (subStep: number, allData: T) => Partial<T>;
}

export function useSaveStepData<T extends FieldValues>({
  stepNumber,
  methods,
  isMobile,
  onSaveStepData,
  setCurrentStep,
  onError,
  getPartialDataForSubstep,
}: UseSaveStepDataProps<T>) {
  const { showToast } = useToast();
  const saveQueue = useWizardSaveQueue();
  const isDebugMode = import.meta.env.MODE !== "production";
  const emitTrace = useCallback(
    (name: string, detail: Record<string, unknown>) => {
      if (!isWizardProfilerEnabled() || typeof window === "undefined") return;
      window.dispatchEvent(new CustomEvent(name, { detail }));
    },
    [],
  );

  const saveStepData = useCallback(
    async (
      stepLeaving: number,
      stepGoing: number,
      skipValidation: boolean,
      goingBackwards: boolean,
    ): Promise<boolean> => {
      if (!methods) {
        setCurrentStep(stepGoing);
        return true;
      }

      if (!skipValidation && !goingBackwards && isDebugMode) {
        const sliceKeys = Object.keys(
          getPartialDataForSubstep(stepLeaving, methods.getValues()),
        );

        if (sliceKeys.length > 0) {
          const validationStart = performance.now();
          const ok = await methods.trigger(sliceKeys as Path<T>[]);
          emitTrace("wizard-validation-trace", {
            step: stepNumber,
            subStep: stepLeaving,
            durationMs: performance.now() - validationStart,
            keys: sliceKeys.length,
            ok,
          });
          if (!ok) {
            console.warn("Validation failed, showing errors");
            const allErrors = methods.formState.errors as Record<
              Path<T>,
              yup.ValidationError
            >;
            console.error("Validation errors:", allErrors);
            showToast("Vänligen korrigera felen.", "error");
            onError?.();
            return false;
          }
        }
      }

      const part = getPartialDataForSubstep(stepLeaving, methods.getValues());

      if (Object.keys(part).length === 0) {
        setCurrentStep(stepGoing);
        return true;
      }

      try {
        // ✅ 1) Save current sub-step first
        const saveStart = performance.now();
        const ok = await onSaveStepData(
          stepNumber,
          stepLeaving,
          part,
          goingBackwards,
        );
        emitTrace("wizard-save-trace", {
          step: stepNumber,
          subStep: stepLeaving,
          durationMs: performance.now() - saveStart,
          phase: "api",
          ok,
          direction: goingBackwards ? "back" : "forward",
        });
        if (!ok) throw new Error("API save returned false");

        // ✅ 2) Only after success: flush backlog
        if (!goingBackwards) {
          const flushStart = performance.now();
          await saveQueue.flush();
          emitTrace("wizard-save-trace", {
            step: stepNumber,
            subStep: stepLeaving,
            durationMs: performance.now() - flushStart,
            phase: "flush",
            ok: true,
            direction: "forward",
          });
        }
      } catch (err) {
        console.error("Error saving step data:", err);
        onError?.();

        // queue it
        saveQueue.enqueue({
          stepNumber,
          subStepNumber: stepLeaving,
          data: part,
          goingBackwards,
        });
        return false;
      }

      setCurrentStep(stepGoing);
      return true;
    },
    [
      methods,
      stepNumber,
      onSaveStepData,
      setCurrentStep,
      showToast,
      onError,
      saveQueue,
      getPartialDataForSubstep,
      emitTrace,
    ], // <-- (2) Add to dependency array
  );

  return { saveStepData };
}
