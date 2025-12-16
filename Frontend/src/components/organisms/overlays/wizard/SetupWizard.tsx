import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Wallet,
    User,
    CheckCircle,
    CreditCard,
} from "lucide-react";
import { usePerformanceMode } from '@/hooks/usePerformanceMode';
import clsx from 'clsx';

import WizardStepContainer from "@components/molecules/containers/WizardStepContainer";

import type { StepBudgetSavingsRef } from "@/types/Wizard/StepBudgetSavingsRef";
import type { StepBudgetDebtsRef } from "@/types/Wizard/StepBudgetDebtsRef";
import type { StepBudgetFinalRef } from "@/types/Wizard/StepBudgetFinalRef";
import type { WizardFormWrapperStep1Ref } from '@components/organisms/overlays/wizard/steps/StepBudgetIncome1/wrapper/WizardFormWrapperStep1';
import type { StepBudgetExpenditureRef } from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/StepBudgetExpenditure";

// Lazy components:
const StepWelcome = lazy(() =>
    import("@components/organisms/overlays/wizard/steps/StepWelcome")
);
const WizardFormWrapperStep1 = lazy(() =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetIncome1/wrapper/WizardFormWrapperStep1")
);
const StepBudgetIncome = lazy(() =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetIncome1/StepBudgetIncome")
);
const StepExpenditure = lazy(() =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/StepBudgetExpenditure")
);
const StepBudgetSavings = lazy(() =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetSavings3/StepBudgetSavings")
);
const StepBudgetDebts = lazy(() =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetDebts4/StepBudgetDebts")
);
const StepBudgetFinal = lazy(() =>
    import("@components/organisms/overlays/wizard/steps/StepBudgetFinal5/StepBudgetFinal")
);

import { useToast } from "@context/ToastContext";
import useSaveWizardStep from "@hooks/wizard/useSaveWizardStep";
import useWizardInit from "@hooks/wizard/useWizardInit";
import useMediaQuery from "@hooks/useMediaQuery";
import useWizardNavigation from "@hooks/wizard/useWizardNavigation";
import useBudgetInfoDisplayFlags from "@hooks/wizard/flagHooks/useBudgetInfoDisplayFlags";
import { useWizardFinalization } from "@hooks/wizard/useWizardFinalization";
import WizardHeading from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardHeading";
import WizardProgress from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress";
import AnimatedContent from "@components/atoms/wrappers/AnimatedContent";
import WizardNavPair from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardNavPair";
import ConfirmModal from "@components/atoms/modals/ConfirmModal";
import { useWizard, WizardProvider } from '@/context/WizardContext';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';
import LoadingScreen from "@/components/molecules/feedback/LoadingScreen";
import { BudgetGuideSkeleton } from "@/components/atoms/loading/BudgetGuideSkeleton";
// ---------------------------- TYPES ----------------------------
interface SetupWizardProps {
    onClose: () => void;
}

// =========================================================================
// THE MIND OF GANDALF (The Main Component)
// =========================================================================
const SetupWizard: React.FC<SetupWizardProps> = ({ onClose }) => {
    // All of the hooks and state management are safely kept here.
    const perfMode = usePerformanceMode();
    const isLowPerf = perfMode === 'low';
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [showShakeAnimation, setShowShakeAnimation] = useState(false);
    const wizardSessionId = useWizardSessionStore(state => state.wizardSessionId);
    const { showToast } = useToast();
    const {
        loading: initLoading,
        failedAttempts,
        connectionError,
        initWizard,
        initialStep,
        initialSubStep,
    } = useWizardInit();
    const { income, expenditure, savings, debts } = useWizardDataStore(state => ({
        income: state.data.income,
        expenditure: state.data.expenditure,
        savings: state.data.savings,
        debts: state.data.debts,
    }));
    const { handleSaveStepData } = useSaveWizardStep(wizardSessionId || '');
    const [transitionLoading, setTransitionLoading] = useState(false);
    const [currentStepState, setCurrentStepState] = useState<Record<number, any>>({});
    const [step, setStep] = useState(0);
    const [isStepValid, setIsStepValid] = useState(true);
    const isDebugMode = process.env.NODE_ENV === 'development';
    const step1WrapperRef = useRef<WizardFormWrapperStep1Ref>(null);
    const StepBudgetExpenditureRef = useRef<StepBudgetExpenditureRef>(null);
    const step3Ref = useRef<StepBudgetSavingsRef>(null);
    const step4Ref = useRef<StepBudgetDebtsRef>(null);
    const step5Ref = useRef<StepBudgetFinalRef>(null);
    const stepRefs: { [key: number]: React.RefObject<any> } = { 1: step1WrapperRef, 2: StepBudgetExpenditureRef, 3: step3Ref, 4: step4Ref, 5: step5Ref };
    const { setShowSideIncome, setShowHouseholdMembers } = useBudgetInfoDisplayFlags();
    const [subTick, setSubTick] = useState(0);
    const { setIncome, setExpenditure, setSavings, setDebts } = useWizardDataStore();

    const { finalizeWizard, isFinalizing, finalizationError } = useWizardFinalization();

    // All the callbacks and effects also remain here, safe and sound.
    const handleWizardClose = useCallback(() => { setConfirmModalOpen(true); }, []);
    const handleConfirmCloseWizard = useCallback(() => { setConfirmModalOpen(false); onClose(); }, [onClose]);
    const handleCancelCloseWizard = useCallback(() => { setConfirmModalOpen(false); }, []);
    const triggerShakeAnimation = (duration = 1000) => { setShowShakeAnimation(true); setTimeout(() => setShowShakeAnimation(false), duration); };
    const initialDataForStep = (stepNumber: number) => {
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
    };
    const initialSubStepForStep = (stepNumber: number) => (currentStepState[stepNumber]?.subStep || initialSubStep) ?? 1;
    useEffect(() => { if (initialStep > 0) setStep(initialStep); }, [initialStep]);
    const { nextStep: hookNextStep, prevStep: hookPrevStep } = useWizardNavigation({
        step, setStep, totalSteps: 5, stepRefs, setTransitionLoading, setCurrentStepState, handleSaveStepData, triggerShakeAnimation, isDebugMode, setShowSideIncome, setShowHouseholdMembers,
    });

    useEffect(() => { setIsStepValid(step === 0); }, [step]);

    const handleFinalizeSuccess = useCallback(() => {
        onClose();
    }, [onClose]);

    const syncStoreWithCurrentStep = useCallback(() => {
        const api = stepRefs[step]?.current;
        const getData = api && typeof api.getStepData === 'function' ? api.getStepData : null;
        if (!getData) return;
        const data = getData();
        if (step === 1) setIncome(data);
        if (step === 2) setExpenditure(data);
        if (step === 3) setSavings(data);
        if (step === 4) setDebts(data);
    }, [step, stepRefs, setIncome, setExpenditure, setSavings, setDebts]);

    const handleSubStepChange = useCallback((newSubStep: number) => {
        setCurrentStepState(prev => ({
            ...prev,
            [step]: { ...prev[step], subStep: newSubStep }
        }));
        syncStoreWithCurrentStep();
        setSubTick(t => t + 1);
    }, [step, syncStoreWithCurrentStep]);

    const handleStepClick = (targetStep: number) => { setStep(targetStep); };

    const subNav = useMemo(() => {
        const api = stepRefs[step]?.current;
        if (api && typeof api.hasSubSteps === "function" && api.hasSubSteps()) {
            return {
                prevSub: api.goPrevSub,
                nextSub: api.goNextSub,
                hasPrevSub: typeof api.hasPrevSub === 'function' ? api.hasPrevSub() : false,
                hasNextSub: typeof api.hasNextSub === 'function' ? api.hasNextSub() : false,
            };
        }
        return { prevSub: () => { }, nextSub: () => { }, hasPrevSub: false, hasNextSub: false };
    }, [step, subTick]);


    const isSaving = useMemo(() => {
        const api = stepRefs[step]?.current;
        return api && typeof api.isSaving === 'function'
            ? api.isSaving()
            : false;
    }, [step, subTick]);

    const isMobile = useMediaQuery('(max-width: 1367px)');

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
                steps={[
                    { icon: Wallet, label: "Inkomster" },
                    { icon: CreditCard, label: "Utgifter" },
                    { icon: User, label: "Sparande" },
                    { icon: CreditCard, label: "Skulder" },
                    { icon: CheckCircle, label: "Bekräfta" },
                ]}
                handleStepClick={handleStepClick}
                isMobile={isMobile}
                wizardSessionId={wizardSessionId}
                isDebugMode={isDebugMode}
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
                subTick={subTick}
                triggerShakeAnimation={triggerShakeAnimation}
                isFinalizing={isFinalizing}
                finalizeWizard={finalizeWizard}
                finalizationError={finalizationError}
                onFinalizeSuccess={handleFinalizeSuccess}
                isLowPerf={isLowPerf}
            />
        </WizardProvider>
    );
};

// =========================================================================
// THE BODY OF GANDALF (The Helper Component)
// =========================================================================
const WizardContent = (props: any) => {
    const { isActionBlocked } = useWizard();
    const { isLowPerf } = props;
    const [outermostScrollNode, setOutermostScrollNode] = useState<HTMLDivElement | null>(null);
    const outermostContainerPact = useCallback((node: HTMLDivElement | null) => {
        if (node !== null) {
            setOutermostScrollNode(node);
        }
    }, []);

    console.log("WizardContent render", { step: props.step, init: props.initLoading, trans: props.transitionLoading, final: props.isFinalizing });
    useEffect(() => {

        if (outermostScrollNode) {

            outermostScrollNode.scrollTo({ top: 0, behavior: 'auto' });
        }
    }, [props.step, props.subTick, outermostScrollNode]);

    return (
        <div ref={outermostContainerPact} className="fixed inset-0 z-[2000] overflow-y-auto w-full h-full ">
            <div
                className={clsx(
                    'flex items-center justify-center min-h-screen py-10',
                    // ↓ lighter bg, no extra opacity gymnastics in low perf
                    isLowPerf ? 'bg-black/70' : 'bg-black bg-opacity-50'
                )}
            >
                <motion.div
                    // ↓ in low-perf: skip enter animation entirely (initial=false)
                    initial={isLowPerf ? false : { opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={isLowPerf ? { opacity: 0 } : { opacity: 0, y: 20 }}
                    transition={isLowPerf ? { duration: 0.12 } : { duration: 0.25 }}
                    className={clsx(
                        'p-6 rounded-2xl shadow-xl w-11/12 relative',
                        // ↓ drop blur and opacity layering in low-perf
                        isLowPerf
                            ? 'bg-standardMenuColor'
                            : 'bg-standardMenuColor bg-opacity-40 backdrop-blur-lg'
                    )}
                >
                    <button type="button" onClick={props.handleWizardClose} title="Close Wizard" className="absolute top-3 right-3 text-red-600 hover:text-red-800">
                        <X size={24} />
                    </button>
                    <WizardHeading step={props.step} type="wizard" />
                    <WizardProgress step={props.step} totalSteps={props.totalSteps} steps={props.steps} onStepClick={props.handleStepClick} useBlackText={true} />
                    <AnimatedContent
                        animationKey={String(props.step)}
                        triggerKey={`${props.step}-${props.subTick}`}
                        className="mb-6 text-center text-gray-700"
                        disableAnimation={isLowPerf}
                    >
                        <WizardStepContainer maxWidth={props.step === 1 ? "md" : undefined}>
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
                                        {props.step === 1 && (
                                            (props.wizardSessionId || props.isDebugMode) ? (
                                                <WizardFormWrapperStep1 ref={props.stepRefs[1]}>
                                                    <StepBudgetIncome
                                                        onNext={props.hookNextStep}
                                                        onPrev={props.hookPrevStep}
                                                        loading={props.transitionLoading || props.initLoading}
                                                        stepNumber={1}
                                                    />
                                                </WizardFormWrapperStep1>
                                            ) : (
                                                <p>Tekniskt fel!</p>
                                            )
                                        )}

                                        {props.step === 2 && (
                                            <StepExpenditure
                                                ref={props.stepRefs[2]}
                                                setStepValid={props.setIsStepValid}
                                                wizardSessionId={props.wizardSessionId || ''}
                                                onSaveStepData={props.handleSaveStepData}
                                                stepNumber={2}
                                                initialData={props.initialDataForStep(2)}
                                                onNext={props.hookNextStep}
                                                onPrev={props.hookPrevStep}
                                                loading={props.transitionLoading || props.initLoading}
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
                                                loading={props.transitionLoading || props.initLoading}
                                                initialSubStep={props.initialSubStepForStep(3)}
                                                onSubStepChange={props.handleSubStepChange}
                                                wizardSessionId={props.wizardSessionId || ''}
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
                                                loading={props.transitionLoading || props.initLoading}
                                                initialSubStep={props.initialSubStepForStep(4)}
                                                onSubStepChange={props.handleSubStepChange}
                                                wizardSessionId={props.wizardSessionId || ''}
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
                                                loading={props.transitionLoading || props.initLoading || props.isFinalizing}
                                                initialSubStep={props.initialSubStepForStep(5)}
                                                onSubStepChange={props.handleSubStepChange}
                                                wizardSessionId={props.wizardSessionId || ''}
                                                onSaveStepData={props.handleSaveStepData}
                                                stepNumber={5}
                                                initialData={props.initialDataForStep(5)}
                                                onValidationError={props.triggerShakeAnimation}
                                                finalizeWizard={props.finalizeWizard}
                                                isFinalizing={props.isFinalizing}
                                                finalizationError={props.finalizationError}
                                                onFinalizeSuccess={props.onFinalizeSuccess}
                                            />
                                        )}
                                    </>
                                )}
                            </Suspense>
                        </WizardStepContainer>
                    </AnimatedContent>
                    <div className="w-full max-w-4xl mx-auto">
                        <div className="my-6 w-full flex items-center justify-between">
                            <WizardNavPair
                                step={props.step}
                                prevStep={props.subNav.hasPrevSub ? props.subNav.prevSub : props.hookPrevStep}
                                nextStep={props.subNav.hasNextSub ? props.subNav.nextSub : props.hookNextStep}
                                hasPrev={props.subNav.hasPrevSub || props.step > 0}
                                hasNext={props.subNav.hasNextSub || props.step < props.totalSteps}
                                hasPrevSub={props.subNav.hasPrevSub}
                                hasNextSub={props.subNav.hasNextSub}
                                connectionError={props.connectionError}
                                initLoading={props.initLoading}
                                transitionLoading={props.transitionLoading}
                                isDebugMode={props.isDebugMode}
                                showShakeAnimation={props.showShakeAnimation}
                                isSaving={props.isSaving}
                                isActionBlocked={isActionBlocked}
                            />
                        </div>
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
        </div>
    );
};

export default SetupWizard;
