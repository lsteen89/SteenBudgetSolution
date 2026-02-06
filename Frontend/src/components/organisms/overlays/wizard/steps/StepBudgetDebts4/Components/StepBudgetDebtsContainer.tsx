import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
  lazy,
  Suspense,
  useMemo,
} from "react";
import type { UseFormReturn, FieldErrors } from "react-hook-form";
import WizardSkeleton from "@/components/organisms/overlays/wizard/SharedComponents/Skeletons/WizardSkeleton";
import { WizardOverlaySkeleton } from "@/components/organisms/overlays/wizard/SharedComponents/Skeletons/WizardOverlaySkeleton";
import AnimatedContent from "@components/atoms/wrappers/AnimatedContent";
import type { Step4FormValues } from "@/types/Wizard/Step4_Debt/Step4FormValues";
import { ensureStep4Defaults } from "@/utils/wizard/ensureStep4Defaults";
import { useSaveStepData } from "@hooks/wizard/useSaveStepData";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import useMediaQuery from "@hooks/useMediaQuery";
import WizardOverlayShell from "@/components/organisms/overlays/wizard/SharedComponents/shells/WizardOverlayShell";
import WizardProgress from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress";
import StepCarousel from "@components/molecules/progress/StepCarousel";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWizard } from "@/context/WizardContext";

import WizardFormWrapperStep4, {
  WizardFormWrapperStep4Ref,
} from "./wrapper/WizardFormWrapperStep4";

import { Info, CreditCard, ShieldCheck } from "lucide-react";
import { SubStepDebtsApi } from "./Pages/SubSteps/2_SubStepDebts/SubStepDebts";

/* ───────────────── Lazy substeps ───────────────── */
const SubStepGatekeeper = lazy(() => import("./Pages/SubSteps/1_SubStepGatekeeper/SubStepGatekeeper"));
const SubStepDebts = lazy(() => import("./Pages/SubSteps/2_SubStepDebts/SubStepDebts"));
const SubStepConfirm = lazy(() => import("./Pages/SubSteps/3_SubStepConfirm/Components/SubStepConfirmDebtsConnected"));

/* ───────────────── Preload helper ───────────────── */
const preload = (fn: () => Promise<any>) => {
  if (typeof (window as any).requestIdleCallback === "function") {
    (window as any).requestIdleCallback(() => fn());
  } else {
    setTimeout(() => fn(), 200);
  }
};

const debtLoaders: Record<number, () => Promise<any>> = {
  1: () => import("./Pages/SubSteps/1_SubStepGatekeeper/SubStepGatekeeper"),
  2: () => import("./Pages/SubSteps/2_SubStepDebts/SubStepDebts"),
  3: () => import("./Pages/SubSteps/3_SubStepConfirm/Components/SubStepConfirmDebtsConnected"),
};

/* ───────────────── Types ───────────────── */
export interface StepBudgetDebtsContainerRef {
  validateFields(): Promise<boolean>;
  getStepData(): Step4FormValues;
  markAllTouched(): void;
  getErrors(): FieldErrors<Step4FormValues>;
  getCurrentSubStep(): number;
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
  hasSubSteps: () => boolean;
  getTotalSubSteps: () => number;
  getPartialDataForSubStep?: (subStep: number) => Partial<Step4FormValues>;
}

interface StepBudgetDebtsContainerProps {
  wizardSessionId: string;
  onSaveStepData: (
    step: number,
    subStep: number,
    data: any,
    goingBackwards: boolean
  ) => Promise<boolean>;
  stepNumber: number;
  initialData?: Partial<Step4FormValues>;
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  initialSubStep: number;
  onSubStepChange?: (newSub: number) => void;
  onValidationError?: () => void;
}

function getDebtsPartialData(subStep: number, allData: Step4FormValues): Partial<Step4FormValues> {
  switch (subStep) {
    case 1:
      return { intro: allData.intro };
    case 2:
      return { debts: allData.debts };
    case 3:
      return { summary: allData.summary };
    default:
      return {};
  }
}

/* ───────────────── Component ───────────────── */
const StepBudgetDebtsContainer = forwardRef<
  StepBudgetDebtsContainerRef,
  StepBudgetDebtsContainerProps
>((props, ref) => {
  const {
    onSaveStepData,
    stepNumber,
    initialData = {},
    onNext,
    onPrev,
    loading: parentLoading,
    initialSubStep,
    onSubStepChange,
    onValidationError,
  } = props;

  const isMobile = useMediaQuery("(max-width: 1367px)");
  const totalSteps = 3;

  /* 1) Hydrate slice once (API -> store) */
  const hasHydrated = useRef(false);
  const { setDebts } = useWizardDataStore();

  useEffect(() => {
    if (!hasHydrated.current && initialData && Object.keys(initialData).length > 0) {
      const complete = ensureStep4Defaults(initialData);
      setDebts(complete);
      hasHydrated.current = true;
    }
  }, [initialData, setDebts]);

  /* 2) Local state */
  const [isSaving, setIsSaving] = useState(false);
  const [currentSub, setCurrentSub] = useState(initialSubStep || 1);
  const [formMethods, setFormMethods] = useState<UseFormReturn<Step4FormValues> | null>(null);
  const [isFormHydrated, setIsFormHydrated] = useState(false);
  const subStepDebtsRef = useRef<SubStepDebtsApi>(null);
  // Track skip so "Prev" from confirm can jump to intro if they skipped debts earlier
  const skippedDebts = formMethods?.getValues("intro.hasDebts") === false;

  const handleFormHydration = () => setIsFormHydrated(true);
  const { setValidationAttempted } = useWizard();
  /* 3) Capture RHF methods once */
  const hasSetMethods = useRef(false);
  const handleFormWrapperRef = useCallback((instance: WizardFormWrapperStep4Ref | null) => {
    if (instance && !hasSetMethods.current) {
      setFormMethods(instance.getMethods());
      hasSetMethods.current = true;
    }
  }, []);

  /* 4) Save hook */
  const { saveStepData } = useSaveStepData<Step4FormValues>({
    stepNumber,
    methods: formMethods ?? undefined,
    isMobile,
    onSaveStepData,
    setCurrentStep: setCurrentSub,
    onError: () => onValidationError?.(),
    getPartialDataForSubstep: getDebtsPartialData,
  });

  /* 5) Derived: should skip debt entry? */
  const hasDebts = formMethods?.getValues("intro.hasDebts");
  const shouldSkipDebts = hasDebts === false;

  /* 6) Preload next substep */
  useEffect(() => {
    const next = Math.min(currentSub + 1, totalSteps);
    const loader = debtLoaders[next];
    if (loader) preload(loader);
  }, [currentSub]);

  /* 7) Navigation helper */
  const goToSub = async (dest: number) => {
    const goingBack = dest < currentSub;
    const skipValidation = goingBack;

    setIsSaving(true);

    const ok = await saveStepData(currentSub, dest, skipValidation, goingBack);

    if (!ok && !goingBack) {
      if (currentSub === 2) {
        setValidationAttempted("step4.debts", true);


        queueMicrotask(() => subStepDebtsRef.current?.openFirstErrorDebt());
        // or requestAnimationFrame(() => subStepDebtsRef.current?.openFirstErrorDebt());
      }
      setIsSaving(false);
      return;
    }

    if (ok) {
      if (currentSub === 2) setValidationAttempted("step4.debts", false);
      setCurrentSub(dest);
    }

    setIsSaving(false);
  };

  const next = async () => {
    if (currentSub === 1) {
      const valid = await formMethods?.trigger("intro");
      if (!valid) {
        onValidationError?.();
        return;
      }

      // ✅ Read it NOW (fresh), not from stale render
      const hasDebtsNow = formMethods?.getValues("intro.hasDebts");

      if (hasDebtsNow === false) {
        //setSkippedDebts(true);

        setIsSaving(true);
        const ok = await saveStepData(1, 2, false, false);
        setIsSaving(false);

        if (ok) {
          const complete = ensureStep4Defaults(formMethods?.getValues() ?? {});
          setDebts({ ...complete, intro: { hasDebts: false }, debts: [] });
          onNext();
        } else {
          onValidationError?.();
        }
        return;
      }

      // ✅ Only go to substep 2 if it's explicitly true
      await goToSub(2);
      return;
    }

    if (currentSub < totalSteps) {
      await goToSub(currentSub + 1);
      return;
    }

    onNext();
  };

  const prev = () => {
    if (currentSub > 1) {
      goToSub(currentSub - 1);
      return;
    }
    onPrev();
  };

  const clickProgress = (d: number) => goToSub(d);

  /* 8) Notify parent when ready */
  useEffect(() => {
    if (isFormHydrated) onSubStepChange?.(currentSub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSub, isFormHydrated]);

  /* 9) Imperative API */
  useImperativeHandle(ref, () => ({
    validateFields: () => formMethods?.trigger() ?? Promise.resolve(false),
    getStepData: () => {
      const all = formMethods?.getValues() ?? {};
      return ensureStep4Defaults(all);
    },
    markAllTouched: () => formMethods?.trigger(),
    getErrors: () => formMethods?.formState.errors ?? {},
    getCurrentSubStep: () => currentSub,
    goPrevSub: prev,
    goNextSub: next,
    hasPrevSub: () => currentSub > 1,
    hasNextSub: () => currentSub < totalSteps,
    isSaving: () => isSaving,
    hasSubSteps: () => true,
    getTotalSubSteps: () => totalSteps,
    getPartialDataForSubStep: (subStep: number) => {
      const all = ensureStep4Defaults(formMethods?.getValues() ?? {});
      return getDebtsPartialData(subStep, all);
    },
  }));

  /* 10) Render helpers */
  const steps = useMemo(
    () => [
      { icon: Info, label: "Intro" },
      { icon: CreditCard, label: "Skulder" },
      { icon: ShieldCheck, label: "Bekräfta" },
    ],
    []
  );

  const renderSubStep = () => {
    switch (currentSub) {
      case 1:
        return <SubStepGatekeeper />;
      case 2:
        return <SubStepDebts ref={subStepDebtsRef} />
      case 3:
        return <SubStepConfirm onContinue={next} />;
      default:
        return <div>All sub-steps complete!</div>;
    }
  };
  const suspenseVariant =
    currentSub === 1 ? "intro" : currentSub === totalSteps ? "confirm" : "form";
  return (
    <WizardFormWrapperStep4
      ref={handleFormWrapperRef}
      onHydrationComplete={handleFormHydration}
    >
      <WizardOverlayShell className="h-full">

        <form className="relative flex flex-col h-full">
          {/* Overlay saving skeleton (does NOT affect layout) */}


          {/* Shared width frame for progress + content */}
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 flex flex-col h-full">
            {/* Header navigation */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex-1 text-center">
                {isMobile ? (
                  <StepCarousel steps={steps} currentStep={currentSub - 1} />
                ) : (
                  <WizardProgress
                    step={currentSub}
                    totalSteps={totalSteps}
                    steps={steps}
                    isDebugMode={import.meta.env.MODE === "development"}
                    onStepClick={clickProgress}
                  />
                )}
              </div>
            </div>


            {/* Content area */}
            <div className="flex-1 min-h-0">
              <Suspense
                fallback={
                  <WizardSkeleton
                    variant={suspenseVariant}
                    withProgress={false}
                    withFooter={suspenseVariant === "confirm"}
                    withinCard={false}
                  />
                }
              >
                <AnimatedContent
                  animationKey={String(currentSub)}
                  triggerKey={String(currentSub)}
                >
                  {renderSubStep()}
                </AnimatedContent>
              </Suspense>
            </div>
          </div>
        </form>

      </WizardOverlayShell>
    </WizardFormWrapperStep4>
  );
});

StepBudgetDebtsContainer.displayName = "StepBudgetDebtsContainer";
export default StepBudgetDebtsContainer;


