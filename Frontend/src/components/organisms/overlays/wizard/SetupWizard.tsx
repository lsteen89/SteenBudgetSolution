import { WizardPerformanceToggle } from "@/components/organisms/overlays/wizard/SharedComponents/Buttons/WizardPerformanceToggle";
import { FINAL_SUMMARY_UNLOCK } from "@/components/organisms/overlays/wizard/SharedComponents/Const/wizardEntitlements";
import WizardSummaryNavAssist from "@/components/organisms/overlays/wizard/SharedComponents/Nav/WizardSummaryNavAssist";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";
import clsx from "clsx";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Landmark,
  PiggyBank,
  Receipt,
  Wallet,
} from "lucide-react";
import React, {
  lazy,
  Profiler,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ProfilerOnRenderCallback,
} from "react";
import { shallow } from "zustand/shallow";
import { WizardPerformanceChip } from "./SharedComponents/Chips/WizardPerformanceChip";

import type { StepBudgetDebtsRef } from "@/types/Wizard/Step3_Savings/StepBudgetDebtsRef";
import type { StepBudgetSavingsRef } from "@/types/Wizard/Step3_Savings/StepBudgetSavingsRef";
import type { StepBudgetFinalRef } from "@/types/Wizard/Step5_Final/StepBudgetFinalRef";
import type { StepBudgetExpenditureRef } from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/StepBudgetExpenditure";
import type { WizardFormWrapperStep1Ref } from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/wrapper/WizardFormWrapperStep1";

// Lazy components:
const StepWelcome = lazy(
  () => import("@components/organisms/overlays/wizard/steps/StepWelcome"),
);
const WizardFormWrapperStep1 = lazy(
  () =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetIncome1/wrapper/WizardFormWrapperStep1"),
);
const StepBudgetIncome = lazy(
  () =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetIncome1/StepBudgetIncome"),
);
const StepExpenditure = lazy(
  () =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/StepBudgetExpenditure"),
);
const StepBudgetSavings = lazy(
  () =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetSavings3/StepBudgetSavings"),
);
const StepBudgetDebts = lazy(
  () =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetDebts4/StepBudgetDebts"),
);
const StepBudgetFinal = lazy(
  () =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetFinal5/StepBudgetFinal"),
);

import { WizardDivider } from "@/components/atoms/dividers/WizardDividerProps";
import { BudgetGuideSkeleton } from "@/components/atoms/loading/BudgetGuideSkeleton";
import { useWizard, WizardProvider } from "@/context/WizardContext";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { useWizardSessionStore } from "@/stores/Wizard/wizardSessionStore";
import ConfirmModal from "@components/atoms/modals/ConfirmModal";
import AnimatedContent from "@components/atoms/wrappers/AnimatedContent";
import WizardNavPair from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardNavPair";
import WizardProgress from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress";
import useMediaQuery from "@hooks/useMediaQuery";
import useBudgetInfoDisplayFlags from "@hooks/wizard/flagHooks/useBudgetInfoDisplayFlags";
import useSaveWizardStep from "@hooks/wizard/useSaveWizardStep";
import { useWizardFinalization } from "@hooks/wizard/useWizardFinalization";
import useWizardInit from "@hooks/wizard/useWizardInit";
import useWizardNavigation from "@hooks/wizard/useWizardNavigation";
import { isWizardProfilerEnabled } from "@/utils/debug/wizardProfiler";
import { WizardNavEventsProvider } from "./SharedComponents/Nav/WizardNavEvents";
import DataTransparencySection from "./SharedComponents/Pages/DataTransparencySection";
import { WizardHeader } from "./WizardHeader";
// ---------------------------- TYPES ----------------------------
interface SetupWizardProps {
  onClose: () => void;
}

type WizardProfilerEvent = {
  id: string;
  phase: "mount" | "update" | "nested-update";
  step: number;
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
};

type WizardNavTraceEvent = {
  direction: "next" | "prev";
  step: number;
  hasSubSteps: boolean;
  currentSub: number;
  totalSub: number;
  hasNextSub: boolean;
  hasPrevSub: boolean;
  decision: "substep" | "major" | "blocked";
  reason?: string;
};

type WizardValidationTraceEvent = {
  step: number;
  subStep: number;
  durationMs: number;
  keys: number;
  ok: boolean;
};

type WizardSaveTraceEvent = {
  step: number;
  subStep: number;
  durationMs: number;
  phase: "api" | "flush";
  ok: boolean;
  direction: "forward" | "back";
};

const WIZARD_STEPS = [
  { icon: Wallet, label: "Inkomster" },
  { icon: Receipt, label: "Utgifter" },
  { icon: PiggyBank, label: "Sparande" },
  { icon: Landmark, label: "Skulder" },
  { icon: CheckCircle, label: "Bekräfta" },
];

// =========================================================================
// THE MIND OF GANDALF (The Main Component)
// =========================================================================
const SetupWizard: React.FC<SetupWizardProps> = ({ onClose }) => {
  // All of the hooks and state management are safely kept here.

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [showShakeAnimation, setShowShakeAnimation] = useState(false);
  const wizardSessionId = useWizardSessionStore(
    (state) => state.wizardSessionId,
  );
  const {
    loading: initLoading,
    failedAttempts,
    connectionError,
    initWizard,
    initialMajorStep,
    initialSubStep,
  } = useWizardInit();
  const { income, expenditure, savings, debts } = useWizardDataStore(
    (state) => ({
      income: state.data.income,
      expenditure: state.data.expenditure,
      savings: state.data.savings,
      debts: state.data.debts,
    }),
    shallow,
  );
  const { handleSaveStepData } = useSaveWizardStep(wizardSessionId || "");
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [currentStepState, setCurrentStepState] = useState<Record<number, any>>(
    {},
  );
  const [step, setStep] = useState(0);
  const isDebugMode = import.meta.env.MODE === "development";
  const step1WrapperRef = useRef<WizardFormWrapperStep1Ref>(null);
  const StepBudgetExpenditureRef = useRef<StepBudgetExpenditureRef>(null);
  const step3Ref = useRef<StepBudgetSavingsRef>(null);
  const step4Ref = useRef<StepBudgetDebtsRef>(null);
  const step5Ref = useRef<StepBudgetFinalRef>(null);
  const stepRefs = useMemo<Record<number, React.RefObject<any>>>(
    () => ({
      1: step1WrapperRef,
      2: StepBudgetExpenditureRef,
      3: step3Ref,
      4: step4Ref,
      5: step5Ref,
    }),
    [],
  );
  const { setShowSideIncome, setShowHouseholdMembers } =
    useBudgetInfoDisplayFlags();

  const { finalizeWizard, isFinalizing, finalizationError } =
    useWizardFinalization();

  // All the callbacks and effects also remain here, safe and sound.
  const handleWizardClose = useCallback(() => {
    setConfirmModalOpen(true);
  }, []);
  const handleConfirmCloseWizard = useCallback(() => {
    setConfirmModalOpen(false);
    onClose();
  }, [onClose]);
  const handleCancelCloseWizard = useCallback(() => {
    setConfirmModalOpen(false);
  }, []);
  const triggerShakeAnimation = useCallback((duration = 1000) => {
    setShowShakeAnimation(true);
    setTimeout(() => setShowShakeAnimation(false), duration);
  }, []);
  const initialDataForStep = useCallback(
    (stepNumber: number) => {
      const stepStateData = currentStepState[stepNumber]?.data;
      if (stepStateData && Object.keys(stepStateData).length > 0) {
        return stepStateData;
      }
      switch (stepNumber) {
        case 1:
          return income || {};
        case 2:
          return expenditure || {};
        case 3:
          return savings || {};
        case 4:
          return debts || {};
        default:
          return {};
      }
    },
    [currentStepState, debts, expenditure, income, savings],
  );

  // --- Jump helper (major step + substep) ---
  const jumpTo = useCallback(
    (targetStep: number, targetSub: number) => {
      // set major step
      setStep(targetStep);

      // ensure substep gets set after the step mounts
      requestAnimationFrame(() => {
        stepRefs[targetStep]?.current?.setSubStep?.(targetSub);

        // keep store/currentStepState consistent (optional but recommended)
        setCurrentStepState((prev) => ({
          ...prev,
          [targetStep]: { ...(prev[targetStep] ?? {}), subStep: targetSub },
        }));
      });
    },
    [setStep, stepRefs, setCurrentStepState],
  );
  const onEditIncome = useCallback(() => {
    jumpTo(1, 1); // Income -> Overview&Edit
  }, [jumpTo]);

  const onEditExpenditure = useCallback(() => {
    jumpTo(2, 1); // Expenditure -> Overview&Navigation
  }, [jumpTo]);

  // --- Savings edit routes ---
  const onEditSavingsHabit = useCallback(() => {
    jumpTo(3, 2); // Savings -> Habits
  }, [jumpTo]);

  const onEditSavingsGoals = useCallback(() => {
    jumpTo(3, 3); // Savings -> Goals
  }, [jumpTo]);

  const onEditDebts = useCallback(() => {
    jumpTo(4, 2); // Debts -> Add/Edit debts
  }, [jumpTo]);

  const maxMajorStepAllowed = useWizardSessionStore(
    (s) => s.maxMajorStepAllowed,
  );

  const initialSubStepForStep = useCallback(
    (stepNumber: number) => {
      return (currentStepState[stepNumber]?.subStep || initialSubStep) ?? 1;
    },
    [currentStepState, initialSubStep],
  );
  useEffect(() => {
    if (initialMajorStep !== null && initialMajorStep > 0)
      setStep(initialMajorStep);
  }, [initialMajorStep]);
  const { nextStep: hookNextStep, prevStep: hookPrevStep } =
    useWizardNavigation({
      step,
      setStep,
      totalSteps: 5,
      stepRefs,
      setTransitionLoading,
      setCurrentStepState,
      handleSaveStepData,
      triggerShakeAnimation,
      setShowSideIncome,
      setShowHouseholdMembers,
    });

  const currentSub = useMemo(() => {
    const s = currentStepState[step]?.subStep;
    return typeof s === "number" ? s : (initialSubStep ?? 1);
  }, [currentStepState, step, initialSubStep]);

  const handleFinalizeSuccess = useCallback(() => {
    onClose();
  }, [onClose]);

  const setIsStepValid = useCallback((_isValid: boolean) => {
    // Reserved for step-local validation wiring; intentionally no parent state write.
  }, []);

  const handleSubStepChange = useCallback(
    (newSubStep: number) => {
      setCurrentStepState((prev) => ({
        ...prev,
        [step]: { ...prev[step], subStep: newSubStep },
      }));
    },
    [step],
  );

  const handleStepClick = useCallback((targetStep: number) => {
    setStep(targetStep);
  }, []);

  const handlePrevNavigation = useCallback(() => {
    const api = stepRefs[step]?.current;
    const hasSubSteps =
      !!api && typeof api.hasSubSteps === "function" && api.hasSubSteps();
    const currentSub =
      hasSubSteps && typeof api.getCurrentSubStep === "function"
        ? (api.getCurrentSubStep() ?? 1)
        : 1;
    const totalSub =
      hasSubSteps && typeof api.getTotalSubSteps === "function"
        ? (api.getTotalSubSteps() ?? 1)
        : 1;
    const hasPrevSub =
      hasSubSteps && typeof api.hasPrevSub === "function"
        ? api.hasPrevSub()
        : false;
    const hasNextSub =
      hasSubSteps && typeof api.hasNextSub === "function"
        ? api.hasNextSub()
        : false;

    const emitTrace = (
      decision: WizardNavTraceEvent["decision"],
      reason?: string,
    ) => {
      if (!isWizardProfilerEnabled() || typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent<WizardNavTraceEvent>("wizard-nav-trace", {
          detail: {
            direction: "prev",
            step,
            hasSubSteps,
            currentSub,
            totalSub,
            hasNextSub,
            hasPrevSub,
            decision,
            reason,
          },
        }),
      );
    };

    if (hasSubSteps && currentSub > 1 && !hasPrevSub) {
      emitTrace(
        "blocked",
        "Invariant: expected previous substep but API reported none",
      );
      triggerShakeAnimation(450);
      if (import.meta.env.DEV) {
        console.warn("[wizard-nav] blocked unsafe prev major fallback", {
          step,
          currentSub,
          totalSub,
          hasPrevSub,
        });
      }
      return;
    }

    if (hasSubSteps && hasPrevSub && typeof api.goPrevSub === "function") {
      emitTrace("substep");
      api.goPrevSub();
      return;
    }
    emitTrace("major");
    hookPrevStep();
  }, [step, stepRefs, hookPrevStep, triggerShakeAnimation]);

  const handleNextNavigation = useCallback(() => {
    const api = stepRefs[step]?.current;
    const hasSubSteps =
      !!api && typeof api.hasSubSteps === "function" && api.hasSubSteps();
    const currentSub =
      hasSubSteps && typeof api.getCurrentSubStep === "function"
        ? (api.getCurrentSubStep() ?? 1)
        : 1;
    const totalSub =
      hasSubSteps && typeof api.getTotalSubSteps === "function"
        ? (api.getTotalSubSteps() ?? 1)
        : 1;
    const hasPrevSub =
      hasSubSteps && typeof api.hasPrevSub === "function"
        ? api.hasPrevSub()
        : false;
    const hasNextSub =
      hasSubSteps && typeof api.hasNextSub === "function"
        ? api.hasNextSub()
        : false;

    const emitTrace = (
      decision: WizardNavTraceEvent["decision"],
      reason?: string,
    ) => {
      if (!isWizardProfilerEnabled() || typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent<WizardNavTraceEvent>("wizard-nav-trace", {
          detail: {
            direction: "next",
            step,
            hasSubSteps,
            currentSub,
            totalSub,
            hasNextSub,
            hasPrevSub,
            decision,
            reason,
          },
        }),
      );
    };

    if (hasSubSteps && currentSub < totalSub && !hasNextSub) {
      emitTrace(
        "blocked",
        "Invariant: expected next substep but API reported none",
      );
      triggerShakeAnimation(450);
      if (import.meta.env.DEV) {
        console.warn("[wizard-nav] blocked unsafe next major fallback", {
          step,
          currentSub,
          totalSub,
          hasNextSub,
        });
      }
      return;
    }

    if (hasSubSteps && hasNextSub && typeof api.goNextSub === "function") {
      emitTrace("substep");
      api.goNextSub();
      return;
    }
    emitTrace("major");
    hookNextStep();
  }, [step, stepRefs, hookNextStep, triggerShakeAnimation]);

  const subNav = useMemo(() => {
    const api = stepRefs[step]?.current;
    if (api && typeof api.hasSubSteps === "function" && api.hasSubSteps()) {
      return {
        prevSub: api.goPrevSub,
        nextSub: api.goNextSub,
        hasPrevSub:
          typeof api.hasPrevSub === "function" ? api.hasPrevSub() : false,
        hasNextSub:
          typeof api.hasNextSub === "function" ? api.hasNextSub() : false,
      };
    }
    return {
      prevSub: () => {},
      nextSub: () => {},
      hasPrevSub: false,
      hasNextSub: false,
    };
  }, [step, currentSub]);

  const isSaving = useMemo(() => {
    const api = stepRefs[step]?.current;
    if (transitionLoading) return true;
    return api && typeof api.isSaving === "function" ? api.isSaving() : false;
  }, [step, currentSub, stepRefs, transitionLoading]);

  const isMobile = useMediaQuery("(max-width: 1367px)");

  // To who ever is judging this:
  // Yes, its insane.
  // Bite me.
  return (
    <WizardProvider>
      <WizardContent
        onClose={onClose}
        confirmModalOpen={confirmModalOpen}
        handleWizardClose={handleWizardClose}
        handleConfirmCloseWizard={handleConfirmCloseWizard}
        handleCancelCloseWizard={handleCancelCloseWizard}
        showShakeAnimation={showShakeAnimation}
        initLoading={initLoading}
        connectionError={connectionError}
        failedAttempts={failedAttempts}
        initWizard={initWizard}
        transitionLoading={transitionLoading}
        step={step}
        totalSteps={5}
        steps={WIZARD_STEPS}
        handleStepClick={handleStepClick}
        handlePrevNavigation={handlePrevNavigation}
        handleNextNavigation={handleNextNavigation}
        isMobile={isMobile}
        wizardSessionId={wizardSessionId}
        isDebugMode={isDebugMode}
        maxMajorStepAllowed={maxMajorStepAllowed}
        stepRefs={stepRefs}
        hookNextStep={hookNextStep}
        hookPrevStep={hookPrevStep}
        StepBudgetExpenditureRef={StepBudgetExpenditureRef}
        setIsStepValid={setIsStepValid}
        handleSaveStepData={handleSaveStepData}
        initialDataForStep={initialDataForStep}
        initialSubStepForStep={initialSubStepForStep}
        handleSubStepChange={handleSubStepChange}
        step3Ref={step3Ref}
        step4Ref={step4Ref}
        subNav={subNav}
        isSaving={isSaving}
        triggerShakeAnimation={triggerShakeAnimation}
        isFinalizing={isFinalizing}
        finalizeWizard={finalizeWizard}
        finalizationError={finalizationError}
        onFinalizeSuccess={handleFinalizeSuccess}
        currentSub={currentSub}
        onEditIncome={onEditIncome}
        onEditExpenditure={onEditExpenditure}
        onEditSavingsHabit={onEditSavingsHabit}
        onEditSavingsGoals={onEditSavingsGoals}
        onEditDebts={onEditDebts}
        jumpTo={jumpTo}
        nextStep={hookNextStep}
      />
    </WizardProvider>
  );
};

// =========================================================================
// THE BODY OF GANDALF (The Helper Component)
// =========================================================================
const WizardContent = React.memo((props: any) => {
  const { isActionBlocked } = useWizard();
  const perf = usePerformanceMode();
  const isLowPerf = perf.mode === "low";
  const profilerEnabled = isWizardProfilerEnabled();
  const [outermostScrollNode, setOutermostScrollNode] =
    useState<HTMLDivElement | null>(null);
  const [profilerEvents, setProfilerEvents] = useState<WizardProfilerEvent[]>(
    [],
  );
  const [validationEvents, setValidationEvents] = useState<
    WizardValidationTraceEvent[]
  >([]);
  const [saveEvents, setSaveEvents] = useState<WizardSaveTraceEvent[]>([]);
  const outermostContainerPact = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setOutermostScrollNode(node);
    }
  }, []);

  const finalUnlocked = useWizardSessionStore(
    (s) =>
      (s.maxSubStepByMajor?.[FINAL_SUMMARY_UNLOCK.major] ?? 0) >=
      FINAL_SUMMARY_UNLOCK.sub,
  );

  const muteGlobalStepper =
    props.step === 2 || props.step === 3 || props.step === 4;
  const showBackdropEffects = !isLowPerf && !props.isMobile;
  const goToSummary = useCallback(() => props.jumpTo(5, 1), [props.jumpTo]);
  const onStepProfilerRender = useCallback<ProfilerOnRenderCallback>(
    (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
      if (!isWizardProfilerEnabled() || typeof window === "undefined") return;
      if (actualDuration <= 16) return;
      window.dispatchEvent(
        new CustomEvent("wizard-profiler", {
          detail: {
            id,
            phase,
            step: props.step,
            actualDuration,
            baseDuration,
            startTime,
            commitTime,
          },
        }),
      );
    },
    [props.step],
  );

  useEffect(() => {
    if (!profilerEnabled || typeof window === "undefined") return;
    const onProfilerEvent = (event: Event) => {
      const customEvent = event as CustomEvent<WizardProfilerEvent>;
      if (!customEvent.detail) return;
      setProfilerEvents((prev) => [customEvent.detail, ...prev].slice(0, 6));
    };
    window.addEventListener(
      "wizard-profiler",
      onProfilerEvent as EventListener,
    );
    return () =>
      window.removeEventListener(
        "wizard-profiler",
        onProfilerEvent as EventListener,
      );
  }, [profilerEnabled]);

  useEffect(() => {
    if (!profilerEnabled || typeof window === "undefined") return;
    const onValidationEvent = (event: Event) => {
      const customEvent = event as CustomEvent<WizardValidationTraceEvent>;
      if (!customEvent.detail) return;
      setValidationEvents((prev) => [customEvent.detail, ...prev].slice(0, 10));
    };
    const onSaveEvent = (event: Event) => {
      const customEvent = event as CustomEvent<WizardSaveTraceEvent>;
      if (!customEvent.detail) return;
      setSaveEvents((prev) => [customEvent.detail, ...prev].slice(0, 10));
    };
    window.addEventListener(
      "wizard-validation-trace",
      onValidationEvent as EventListener,
    );
    window.addEventListener("wizard-save-trace", onSaveEvent as EventListener);
    return () => {
      window.removeEventListener(
        "wizard-validation-trace",
        onValidationEvent as EventListener,
      );
      window.removeEventListener(
        "wizard-save-trace",
        onSaveEvent as EventListener,
      );
    };
  }, [profilerEnabled]);

  useEffect(() => {
    if (outermostScrollNode) {
      outermostScrollNode.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [props.step, props.currentSub, outermostScrollNode]);

  return (
    <WizardNavEventsProvider>
      <div
        ref={outermostContainerPact}
        className="fixed inset-0 z-[2000] overflow-y-auto w-full h-full "
      >
        <div
          className={clsx(
            "min-h-screen flex justify-center bg-wizard-overlay",
            // mobile: top aligned, tight padding
            "items-start py-3",
            // desktop: centered + more breathing room
            "md:items-center md:py-10",
            showBackdropEffects && "backdrop-blur-[2px] backdrop-saturate-50",
          )}
        >
          <motion.div
            // ↓ in low-perf: skip enter animation entirely (initial=false)
            initial={isLowPerf ? false : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={isLowPerf ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={isLowPerf ? { duration: 0.12 } : { duration: 0.25 }}
            className={clsx(
              "rounded-3xl w-11/12 max-w-6xl relative overflow-hidden",
              "p-4 md:p-6",
              "bg-gradient-to-b from-wizard-shell/95 to-wizard-shell/85",
              "border border-wizard-shellBorder/20",
              "shadow-[0_20px_60px_rgba(2,6,23,0.22)]",
              "before:absolute before:inset-0 before:rounded-3xl before:pointer-events-none",
              "before:ring-1 before:ring-wizard-shellBorder/40",
            )}
          >
            <WizardHeader
              step={props.step}
              onClose={props.handleWizardClose}
              showBrand={props.step !== 0}
              rightSlot={
                props.step > 0 && !perf.isPhone ? (
                  <WizardPerformanceChip
                    mode={perf.mode}
                    override={perf.override}
                    onToggle={() =>
                      perf.setOverride(perf.mode === "low" ? "normal" : "low")
                    }
                    onClearOverride={perf.clearOverride}
                  />
                ) : null
              }
            />

            {props.step === 0 && !perf.isPhone && (
              <WizardPerformanceToggle
                mode={perf.mode}
                override={perf.override}
                onSetLow={() => perf.setOverride("low")}
                onSetNormal={() => perf.setOverride("normal")}
                onClearOverride={perf.clearOverride}
              />
            )}
            {/* Step 0: full explanatory card (not on phone) */}
            <div className="flex flex-col gap-4 md:gap-5">
              {props.step > 0 && (
                <WizardProgress
                  step={props.step}
                  totalSteps={5}
                  steps={props.steps}
                  onStepClick={props.handleStepClick}
                  isDebugMode={props.isDebugMode}
                  tone={muteGlobalStepper ? "muted" : "default"}
                  showProgressLine={true}
                  progressTone={muteGlobalStepper ? "muted" : "accent"}
                  size={muteGlobalStepper ? "tiny" : "default"}
                  maxClickableStep={props.maxMajorStepAllowed}
                  highlightFinal={finalUnlocked}
                  finalLabel="Sammanfattning"
                />
              )}
              <WizardSummaryNavAssist
                step={props.step}
                isMobile={props.isMobile}
                onGoToSummary={goToSummary}
                onContinue={props.nextStep}
              />
              <div className="mt-4 md:mt-5">
                <WizardDivider variant="strong" />
              </div>
              {muteGlobalStepper && (
                <>
                  {/* put the Step-2 sub stepper here (inside StepExpenditure ideally) 
                                I dont remember wtf goes here*/}
                </>
              )}
              <Profiler
                id="wizard-step-content"
                onRender={onStepProfilerRender}
              >
                <AnimatedContent
                  animationKey={String(props.step)}
                  triggerKey={`${props.step}-${props.currentSub}`}
                  //className="mb-6 text-center text-red bg-white/5 rounded-lg p-4"
                  disableAnimation={isLowPerf}
                >
                  {/* <WizardStepContainer> */}
                  <Suspense
                    fallback={
                      <div className="flex w-full min-h-[300px] items-center justify-center rounded-lg bg-white/5">
                        <BudgetGuideSkeleton />
                      </div>
                    }
                  >
                    {props.step === 0 ? (
                      <StepWelcome
                        connectionError={props.connectionError}
                        failedAttempts={props.failedAttempts}
                        loading={props.transitionLoading || props.initLoading}
                        onRetry={props.initWizard}
                      />
                    ) : (
                      <>
                        {props.step === 1 &&
                          (props.wizardSessionId || props.isDebugMode ? (
                            <WizardFormWrapperStep1
                              ref={props.stepRefs[1]}
                              loading={props.initLoading}
                              isSaving={props.transitionLoading}
                              skeletonVariant="form"
                            >
                              <StepBudgetIncome
                                onNext={props.hookNextStep}
                                onPrev={props.hookPrevStep}
                                loading={false}
                                stepNumber={1}
                              />
                            </WizardFormWrapperStep1>
                          ) : (
                            <p>Tekniskt fel!</p>
                          ))}

                        {props.step === 2 && (
                          <StepExpenditure
                            ref={props.stepRefs[2]}
                            setStepValid={props.setIsStepValid}
                            wizardSessionId={props.wizardSessionId || ""}
                            onSaveStepData={props.handleSaveStepData}
                            stepNumber={2}
                            initialData={props.initialDataForStep(2)}
                            onNext={props.hookNextStep}
                            onPrev={props.hookPrevStep}
                            loading={
                              props.transitionLoading || props.initLoading
                            }
                            initialSubStep={props.initialSubStepForStep(2)}
                            onSubStepChange={props.handleSubStepChange}
                            onValidationError={props.triggerShakeAnimation}
                          />
                        )}

                        {props.step === 3 && (
                          <StepBudgetSavings
                            ref={props.stepRefs[3]}
                            onNext={props.hookNextStep}
                            onPrev={props.hookPrevStep}
                            loading={
                              props.transitionLoading || props.initLoading
                            }
                            initialSubStep={props.initialSubStepForStep(3)}
                            onSubStepChange={props.handleSubStepChange}
                            wizardSessionId={props.wizardSessionId || ""}
                            onSaveStepData={props.handleSaveStepData}
                            stepNumber={3}
                            initialData={props.initialDataForStep(3)}
                            onValidationError={props.triggerShakeAnimation}
                          />
                        )}

                        {props.step === 4 && (
                          <StepBudgetDebts
                            ref={props.stepRefs[4]}
                            onNext={props.hookNextStep}
                            onPrev={props.hookPrevStep}
                            loading={
                              props.transitionLoading || props.initLoading
                            }
                            initialSubStep={props.initialSubStepForStep(4)}
                            onSubStepChange={props.handleSubStepChange}
                            wizardSessionId={props.wizardSessionId || ""}
                            onSaveStepData={props.handleSaveStepData}
                            stepNumber={4}
                            initialData={props.initialDataForStep(4)}
                            onValidationError={props.triggerShakeAnimation}
                          />
                        )}

                        {props.step === 5 && (
                          <StepBudgetFinal
                            ref={props.stepRefs[5]}
                            onNext={props.hookNextStep}
                            onPrev={props.hookPrevStep}
                            loading={
                              props.transitionLoading ||
                              props.initLoading ||
                              props.isFinalizing
                            }
                            initialSubStep={props.initialSubStepForStep(5)}
                            onSubStepChange={props.handleSubStepChange}
                            wizardSessionId={props.wizardSessionId || ""}
                            onSaveStepData={props.handleSaveStepData}
                            stepNumber={5}
                            initialData={props.initialDataForStep(5)}
                            onValidationError={props.triggerShakeAnimation}
                            finalizeWizard={props.finalizeWizard}
                            isFinalizing={props.isFinalizing}
                            finalizationError={props.finalizationError}
                            onFinalizeSuccess={props.onFinalizeSuccess}
                            onEditSavingsHabit={props.onEditSavingsHabit}
                            onEditSavingsGoals={props.onEditSavingsGoals}
                            onEditIncome={props.onEditIncome}
                            onEditExpenditure={props.onEditExpenditure}
                            onEditDebts={props.onEditDebts}
                          />
                        )}
                      </>
                    )}
                  </Suspense>
                  {/* </WizardStepContainer> */}
                </AnimatedContent>
              </Profiler>
              <div className="w-full max-w-4xl mx-auto">
                <div className="my-6 w-full flex items-center justify-between">
                  <WizardNavPair
                    step={props.step}
                    prevStep={props.handlePrevNavigation}
                    nextStep={props.handleNextNavigation}
                    hasPrev={props.subNav.hasPrevSub || props.step > 0}
                    hasNext={
                      props.subNav.hasNextSub || props.step < props.totalSteps
                    }
                    hasPrevSub={props.subNav.hasPrevSub}
                    hasNextSub={props.subNav.hasNextSub}
                    connectionError={props.connectionError}
                    initLoading={props.initLoading}
                    transitionLoading={props.transitionLoading}
                    isDebugMode={props.isDebugMode}
                    showShakeAnimation={props.showShakeAnimation}
                    isSaving={props.isSaving}
                    isActionBlocked={isActionBlocked}
                    hideNext={props.step === 2 && props.currentSub === 1}
                  />
                </div>

                {/*TODO: This doesnt look so good. To fix this, or atleast start debugging, set a breakpoint
                        in the GetWizardDataQueryHandler in the BE to clearly see the overlay
                        <WizardMajorOverlay open={showMajorOverlay} variant="form" rows={3} />
                        */}
              </div>
              {/* Welcome and final step, show data transparency section */}
              {(props.step === 0 || props.step === 5) && (
                <DataTransparencySection />
              )}
            </div>
          </motion.div>
        </div>
        <ConfirmModal
          isOpen={props.confirmModalOpen}
          title="Är du säker?"
          description="Om du väljer att avsluta nu så sparas den data du angett i nuvarande form inte"
          onCancel={props.handleCancelCloseWizard}
          onConfirm={props.handleConfirmCloseWizard}
        />
        {profilerEnabled &&
          (profilerEvents.length > 0 ||
            validationEvents.length > 0 ||
            saveEvents.length > 0) && (
            <div className="fixed bottom-4 left-0 z-[2100] w-[26rem] rounded-lg border border-wizard-stroke/40 bg-black/80 p-3 text-xs text-white/90 shadow-xl backdrop-blur-sm">
              <div className="mb-2 font-semibold text-white">
                Wizard debug timings
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded border border-white/10 bg-white/5 p-2">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    Render
                  </div>
                  <div className="space-y-1">
                    {profilerEvents.slice(0, 3).map((event, index) => (
                      <div
                        key={`${event.commitTime}-${index}`}
                        className="flex justify-between gap-2"
                      >
                        <span className="text-white/65">S{event.step}</span>
                        <span className="text-amber-300">
                          {event.actualDuration.toFixed(1)}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-white/5 p-2">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    Validate
                  </div>
                  <div className="space-y-1">
                    {validationEvents.slice(0, 3).map((event, index) => (
                      <div
                        key={`${event.step}-${event.subStep}-${event.durationMs}-${index}`}
                        className="flex justify-between gap-2"
                      >
                        <span className="text-white/65">
                          S{event.step}.{event.subStep}
                        </span>
                        <span
                          className={clsx(
                            event.ok ? "text-emerald-300" : "text-rose-300",
                          )}
                        >
                          {event.durationMs.toFixed(1)}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-white/5 p-2">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    Save
                  </div>
                  <div className="space-y-1">
                    {saveEvents.slice(0, 3).map((event, index) => (
                      <div
                        key={`${event.step}-${event.subStep}-${event.phase}-${event.durationMs}-${index}`}
                        className="flex justify-between gap-2"
                      >
                        <span className="text-white/65">
                          {event.phase === "api" ? "API" : "FL"} S{event.step}.
                          {event.subStep}
                        </span>
                        <span
                          className={clsx(
                            event.ok ? "text-cyan-300" : "text-rose-300",
                          )}
                        >
                          {event.durationMs.toFixed(1)}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </WizardNavEventsProvider>
  );
});

export default SetupWizard;
