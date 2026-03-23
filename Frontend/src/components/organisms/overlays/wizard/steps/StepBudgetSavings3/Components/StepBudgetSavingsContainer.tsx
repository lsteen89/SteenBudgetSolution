import WizardSkeleton from "@/components/organisms/overlays/wizard/SharedComponents/Skeletons/WizardSkeleton";
import AnimatedContent from "@components/atoms/wrappers/AnimatedContent";
import {
  forwardRef,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { FieldErrors, UseFormReturn } from "react-hook-form";

import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { ensureStep3Defaults } from "@/utils/wizard/ensureStep3Defaults";
import useMediaQuery from "@hooks/useMediaQuery";
import { useSaveStepData } from "@hooks/wizard/useSaveStepData";

import StepCarousel from "@components/molecules/progress/StepCarousel";
import WizardProgress from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress";
import type { SubStepGoalsApi } from "./Pages/SubSteps/3_SubStepGoals/SubStepGoals";
import WizardFormWrapperStep3, {
  WizardFormWrapperStep3Ref,
} from "./wrapper/WizardFormWrapperStep3";

// Icons
import { WizardDivider } from "@/components/atoms/dividers/WizardDividerProps";
import { useWizard } from "@/context/WizardContext";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { stepBudgetSavingsContainerDict } from "@/utils/i18n/wizard/stepSavings/StepBudgetSavingsContainer.i18n";
import { Info, PiggyBank, ShieldCheck, Target } from "lucide-react";
import WizardOverlayShell from "../../../SharedComponents/shells/WizardOverlayShell";
/* ───────────────── Lazy substeps ───────────────── */
const SubStepIntro = lazy(
  () => import("./Pages/SubSteps/1_SubStepIntro/SubStepIntro"),
);
const SubStepHabits = lazy(
  () => import("./Pages/SubSteps/2_SubStepHabits/SubStepHabits"),
);
const SubStepGoals = lazy(
  () => import("./Pages/SubSteps/3_SubStepGoals/SubStepGoals"),
);
const SubStepConfirm = lazy(
  () =>
    import("./Pages/SubSteps/4_SubStepConfirm/components/SubStepConfirmSavingsConnected"),
);

/* ───────────────── Preload helper ───────────────── */
const preload = (fn: () => Promise<any>) => {
  if (typeof (window as any).requestIdleCallback === "function") {
    (window as any).requestIdleCallback(() => fn());
  } else {
    setTimeout(() => fn(), 200);
  }
};

const savingsLoaders: Record<number, () => Promise<any>> = {
  1: () => import("./Pages/SubSteps/1_SubStepIntro/SubStepIntro"),
  2: () => import("./Pages/SubSteps/2_SubStepHabits/SubStepHabits"),
  3: () => import("./Pages/SubSteps/3_SubStepGoals/SubStepGoals"),
  4: () =>
    import("./Pages/SubSteps/4_SubStepConfirm/components/SubStepConfirmSavingsConnected"),
};

/* ───────────────── Types ───────────────── */
export interface StepBudgetSavingsContainerRef {
  validateFields(): Promise<boolean>;
  getStepData(): Step3FormValues;
  markAllTouched(): void;
  getErrors(): FieldErrors<Step3FormValues>;
  getCurrentSubStep(): number;
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
  hasSubSteps: () => boolean;
  getTotalSubSteps: () => number;
  setSubStep(sub: number): void;
}

interface StepBudgetSavingsContainerProps {
  wizardSessionId: string;
  onSaveStepData: (
    step: number,
    subStep: number,
    data: any,
    goingBackwards: boolean,
  ) => Promise<boolean>;
  stepNumber: number;
  initialData?: Partial<Step3FormValues>;
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  initialSubStep: number;
  onSubStepChange?: (newSub: number) => void;
  onValidationError?: () => void;
}

function getSavingsPartialData(
  subStep: number,
  allData: Step3FormValues,
): Partial<Step3FormValues> {
  switch (subStep) {
    case 1:
      return { intro: allData.intro };
    case 2:
      return { habits: allData.habits };
    case 3:
      return { goals: allData.goals };
    default:
      return {};
  }
}

/* ───────────────── Component ───────────────── */
const StepBudgetSavingsContainer = forwardRef<
  StepBudgetSavingsContainerRef,
  StepBudgetSavingsContainerProps
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
  } = props;

  const locale = useAppLocale();

  const t = <K extends keyof typeof stepBudgetSavingsContainerDict.sv>(k: K) =>
    tDict(k, locale, stepBudgetSavingsContainerDict);
  const isMobile = useMediaQuery("(max-width: 1367px)");
  const totalSteps = 4;
  const subStepGoalsRef = useRef<SubStepGoalsApi>(null);
  /* 1) Hydrate slice once (from API -> store) */
  const hasHydrated = useRef(false);
  const setSavings = useWizardDataStore((state) => state.setSavings);

  const { setValidationAttempted } = useWizard();

  /* 2) Local state */
  const [isSaving, setIsSaving] = useState(false);
  const [currentSub, setCurrentSub] = useState(initialSubStep || 1);
  const [formMethods, setFormMethods] =
    useState<UseFormReturn<Step3FormValues> | null>(null);
  const [isFormHydrated, setIsFormHydrated] = useState(false);

  const handleFormHydration = () => setIsFormHydrated(true);

  /* 3) Capture RHF methods from wrapper once */
  const hasSetMethods = useRef(false);
  const handleFormWrapperRef = useCallback(
    (instance: WizardFormWrapperStep3Ref | null) => {
      if (instance && !hasSetMethods.current) {
        setFormMethods(instance.getMethods());
        hasSetMethods.current = true;
      }
    },
    [],
  );

  /* 4) Save hook */
  const { saveStepData } = useSaveStepData<Step3FormValues>({
    stepNumber,
    methods: formMethods ?? undefined,
    isMobile,
    onSaveStepData,
    setCurrentStep: setCurrentSub,
    onError: () => props.onValidationError?.(),
    getPartialDataForSubstep: getSavingsPartialData,
  });

  /* 5) Derived: should skip habits? */
  const savingHabit = formMethods?.getValues("intro.savingHabit");
  const shouldSkipHabits = savingHabit === "start" || savingHabit === "no";

  /* 6) Preload next substep bundle */
  useEffect(() => {
    const next = Math.min(currentSub + 1, totalSteps);
    const loader = savingsLoaders[next];
    if (loader) preload(loader);
  }, [currentSub]);

  /* 7) Navigation */
  const goToSub = async (dest: number) => {
    const goingBack = dest < currentSub;
    const skipValidation = goingBack;

    setIsSaving(true);
    const ok = await saveStepData(currentSub, dest, skipValidation, goingBack);
    setIsSaving(false);

    if (!ok && !goingBack) {
      if (currentSub === 3) {
        setValidationAttempted("step3.goals", true);

        queueMicrotask(() => subStepGoalsRef.current?.openFirstErrorGoal());
      }
    }

    if (ok) setCurrentSub(dest);
  };

  const next = async () => {
    if (currentSub === 1) {
      // Decide route based on intro answer
      await goToSub(shouldSkipHabits ? 3 : 2);
      return;
    }

    if (currentSub < totalSteps) {
      await goToSub(currentSub + 1);
      return;
    }

    onNext();
  };

  const prev = () => {
    // If we skipped habits, Goals (3) goes back to Intro (1)
    if (currentSub === 3 && shouldSkipHabits) {
      goToSub(1);
      return;
    }

    if (currentSub > 1) {
      goToSub(currentSub - 1);
      return;
    }

    onPrev();
  };

  /* 8) Progress clicks */
  const clickProgress = (d: number) => goToSub(d);

  /* 9) Notify parent when ready */
  useEffect(() => {
    if (isFormHydrated) onSubStepChange?.(currentSub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSub, isFormHydrated]);

  /* 10) Imperative API */
  useImperativeHandle(ref, () => ({
    validateFields: () => formMethods?.trigger() ?? Promise.resolve(false),
    getStepData: () => formMethods?.getValues() ?? ensureStep3Defaults({}),
    markAllTouched: () => formMethods?.trigger(),
    getErrors: () => formMethods?.formState.errors ?? {},
    getCurrentSubStep: () => currentSub,
    goPrevSub: prev,
    goNextSub: next,
    hasPrevSub: () => (currentSub === 3 && shouldSkipHabits) || currentSub > 1,
    hasNextSub: () => currentSub < totalSteps,
    isSaving: () => isSaving,
    hasSubSteps: () => true,
    getTotalSubSteps: () => totalSteps,
    setSubStep: (sub: number) => {
      setCurrentSub(sub);
      onSubStepChange?.(sub); // important: keep SetupWizard state in sync
    },
  }));

  /* 11) Render helpers */
  const steps = [
    { icon: Info, label: t("stepIntro") },
    { icon: PiggyBank, label: t("stepHabits") },
    { icon: Target, label: t("stepGoals") },
    { icon: ShieldCheck, label: t("stepConfirm") },
  ];

  const renderSubStep = () => {
    switch (currentSub) {
      case 1:
        return <SubStepIntro />;
      case 2:
        return <SubStepHabits />;
      case 3:
        return (
          <SubStepGoals ref={subStepGoalsRef} onGoToHabits={() => goToSub(2)} />
        );
      case 4:
        return <SubStepConfirm />;
      default:
        return <div>All sub-steps complete!</div>;
    }
  };
  const suspenseVariant =
    currentSub === 1 ? "intro" : currentSub === totalSteps ? "confirm" : "form";
  return (
    <WizardFormWrapperStep3
      ref={handleFormWrapperRef}
      onHydrationComplete={handleFormHydration}
    >
      <WizardOverlayShell className="h-full">
        <form className="relative flex flex-col h-full">
          {/* Shared width frame */}
          <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-10 xl:px-14 flex flex-col h-full">
            {/* Header navigation */}
            <div className="flex flex-col items-center gap-3 md:gap-4">
              <div className="w-full text-center">
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
            <WizardDivider variant="subtle" className="mt-4" />

            {/* Content */}
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
        {/* )} */}
      </WizardOverlayShell>
    </WizardFormWrapperStep3>
  );
});

StepBudgetSavingsContainer.displayName = "StepBudgetSavingsContainer";
export default StepBudgetSavingsContainer;
