import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
  lazy,
  Suspense,
} from 'react';
import {
  FormProvider,
  FieldErrors,
  UseFormReturn,
} from 'react-hook-form';

import { Step2FormValues } from '@/schemas/wizard/StepExpenditures/step2Schema';
import WizardFormWrapperStep2, {
  WizardFormWrapperStep2Ref,
} from './wrapper/WizardFormWrapperStep2';

/*Substeps for major step 2  (lazy)*/
const ExpenditureOverviewMainText = lazy(() =>
  import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/1_SubStepWelcome/ExpenditureOverviewMainText')
);
const SubStepRent = lazy(() =>
  import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/2_SubStepRent/SubStepRent')
);
const SubStepFood = lazy(() =>
  import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/3_SubStepFood/SubStepFood')
);
const SubStepFixedExp = lazy(() =>
  import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/4_SubStepFixedExpenses/SubStepFixedExpenses')
);
const SubStepTransport = lazy(() =>
  import('@/components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/5_SubStepTransport/SubStepTransport')
);
const SubStepClothing = lazy(() =>
  import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/6_SubStepClothing/SubStepClothing')
);
const SubStepSubscriptions = lazy(() =>
  import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/7_SubStepSubscriptions/SubStepSubscriptions')
);
const SubStepConfirm = lazy(() =>
  import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/8_SubStepConfirm/SubStepConfirm')
);

import LoadingScreen from '@components/molecules/feedback/LoadingScreen';
import { Skeleton } from '@/components/ui/Skeleton';
import AnimatedContent from '@components/atoms/wrappers/AnimatedContent';
import StepButton from '@components/molecules/buttons/StepButton';
import WizardProgress from '@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress';
import StepCarousel from '@components/molecules/progress/StepCarousel';
import WizardNavPair from '@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardNavPair';

import useMediaQuery from '@hooks/useMediaQuery';
import { useSaveStepData } from '@hooks/wizard/useSaveStepData';
import { ensureStep2Defaults } from "@/utils/wizard/ensureStep2Defaults";

import {
  Info, Home, FileText, Utensils, Car,
  Shirt, CreditCard, ShieldCheck,
} from 'lucide-react';

import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';

/* ------------------------------------------------------------------ */
/* INTERFACES                              */
/* ------------------------------------------------------------------ */
export interface StepBudgetExpenditureContainerRef {
  validateFields(): Promise<boolean>;
  getStepData(): Step2FormValues;
  markAllTouched(): void;
  getErrors(): FieldErrors<Step2FormValues>;
  getCurrentSubStep(): number;
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
  hasSubSteps: () => boolean;
  getTotalSubSteps: () => number;
}

interface StepBudgetExpenditureContainerProps {
  wizardSessionId: string;
  onSaveStepData: (
    step: number,
    subStep: number,
    data: any,
    goingBackwards: boolean
  ) => Promise<boolean>;
  stepNumber: number;
  initialData?: Partial<Step2FormValues>; // fetched from API
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  initialSubStep: number;
  onSubStepChange?: (newSub: number) => void;
  onValidationError?: () => void;
}

function getExpenditurePartialData(
  subStep: number,
  allData: Step2FormValues
): Partial<Step2FormValues> {
  switch (subStep) {
    case 2: return { rent: allData.rent };
    case 3: return { food: allData.food };
    case 4: return { fixedExpenses: allData.fixedExpenses };
    case 5: return { transport: allData.transport };
    case 6: return { clothing: allData.clothing };
    case 7: return { subscriptions: allData.subscriptions };
    // case 8 is the confirm step, no data to slice
    default: return {};
  }
}

/* ------------------------------------------------------------------ */
/* COMPONENT IMPLEMENTATION                     */
/* ------------------------------------------------------------------ */
const StepBudgetExpenditureContainer = forwardRef<
  StepBudgetExpenditureContainerRef,
  StepBudgetExpenditureContainerProps
>((props, ref) => {
  const {
    onSaveStepData,
    stepNumber,
    initialData = {},
    onNext,
    onPrev,
    loading: parentLoading,
    initialSubStep,
  } = props;

  const isMobile = useMediaQuery('(max-width: 1367px)');

  const hasHydrated = useRef(false);

  /* 1 ─── Hydrate slice once --------------------------------------- */
  const { setExpenditure } = useWizardDataStore();
  useEffect(() => {
    // FIX 1: The magical ward. This spell now only runs if it has data
    // and has not been run before, breaking the hydration loop.
    if (initialData && Object.keys(initialData).length > 0 && !hasHydrated.current) {
      setExpenditure(initialData as any);
      hasHydrated.current = true;
    }
  }, [initialData, setExpenditure]);

  /* 2 ─── refs & local state --------------------------------------- */
  const formWrapperRef = useRef<WizardFormWrapperStep2Ref>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [currentSub, setCurrentSub] = useState(initialSubStep || 1);
  const [formMethods, setFormMethods] =
    useState<UseFormReturn<Step2FormValues> | null>(null);
  const [isFormHydrated, setIsFormHydrated] = useState(false);

  const handleFormHydration = () => {
    setIsFormHydrated(true);
  };

  const hasSetMethods = useRef(false);
  const handleFormWrapperRef = useCallback(
    (instance: WizardFormWrapperStep2Ref | null) => {
      if (instance && !hasSetMethods.current) {
        setFormMethods(instance.getMethods());
        hasSetMethods.current = true;
      }
    },
    []
  );

  /* 3 ─── save-hook (methods may be null on first render) ----------- */
  const { saveStepData } = useSaveStepData<Step2FormValues>({
    stepNumber,
    methods: formMethods ?? undefined,
    isMobile,
    onSaveStepData,
    setCurrentStep: setCurrentSub,
    onError: () => props.onValidationError?.(),
    getPartialDataForSubstep: getExpenditurePartialData,
  });

  /* 4 ─── navigation helpers --------------------------------------- */
  const totalSteps = 8;

  const goToSub = async (dest: number) => {
    const goingBack = dest < currentSub;
    const skipValidation = currentSub === 1 || goingBack;

    setIsSaving(true);
    await saveStepData(currentSub, dest, skipValidation, goingBack);
    setIsSaving(false);
  };

  const next = () => {
    if (currentSub < totalSteps) {
      if (currentSub === 1) {
        setCurrentSub(2);
      } else {
        goToSub(currentSub + 1);
      }
    } else {
      onNext();
    }
  };

  const prev = () => {
    console.log(`HAWK 1B: 'prev' called. Current sub-step: ${currentSub}`);
    if (currentSub > 1) {
      goToSub(currentSub - 1);
    }
  };

  /* 5 ─── progress click handlers ---------------------------------- */
  const clickCarousel = (z: number) => goToSub(z + 1);
  const clickProgress = (d: number) => goToSub(d);

  /* 6 ─── notify parent of sub-step -------------------------------- */
  useEffect(() => {
    if (isFormHydrated) {
      console.log(
        `HAWK 1C: Sub-step state is now ${currentSub}. Notifying parent.`
      );
      props.onSubStepChange?.(currentSub);
    }
    // FIX 2: This spell now only listens for a change in the sub-step number,
    // breaking the notification loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSub, isFormHydrated]);


  /* 7 ─── imperative API ------------------------------------------- */
  useImperativeHandle(ref, () => ({
    validateFields: () => formMethods?.trigger() ?? Promise.resolve(false),
    getStepData: () => formMethods?.getValues() ?? ensureStep2Defaults({}),
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
  }));

  /* 8 ─── render helpers ------------------------------------------- */
  const steps = [
    { icon: Info, label: 'Översikt' },
    { icon: Home, label: 'Boende' },
    { icon: Utensils, label: 'Matkostnader' },
    { icon: FileText, label: 'Fasta utgifter' },
    { icon: Car, label: 'Transport' },
    { icon: Shirt, label: 'Kläder' },
    { icon: CreditCard, label: 'Prenumerationer' },
    { icon: ShieldCheck, label: 'Bekräfta' },
  ];

  const renderSubStep = () => {
    switch (currentSub) {
      case 1: return <ExpenditureOverviewMainText />;
      case 2: return <SubStepRent />;
      case 3: return <SubStepFood />;
      case 4: return <SubStepFixedExp />;
      case 5: return <SubStepTransport />;
      case 6: return <SubStepClothing />;
      case 7: return <SubStepSubscriptions />;
      case 8: return <SubStepConfirm />;
      default: return <div>All sub-steps complete!</div>;
    }
  };

  const preload = (fn: () => Promise<any>) => {
    if (typeof (window as any).requestIdleCallback === 'function') {
      (window as any).requestIdleCallback(() => fn());
    } else {
      setTimeout(() => fn(), 200);
    }
  };

  const substepLoaders: Record<number, () => Promise<any>> = {
    1: () => import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/1_SubStepWelcome/ExpenditureOverviewMainText'),
    2: () => import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/2_SubStepRent/SubStepRent'),
    3: () => import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/3_SubStepFood/SubStepFood'),
    4: () => import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/4_SubStepFixedExpenses/SubStepFixedExpenses'),
    5: () => import('@/components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/5_SubStepTransport/SubStepTransport'),
    6: () => import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/6_SubStepClothing/SubStepClothing'),
    7: () => import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/7_SubStepSubscriptions/SubStepSubscriptions'),
    8: () => import('@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/8_SubStepConfirm/SubStepConfirm'),
  };
  useEffect(() => {
    const next = Math.min(currentSub + 1, 8);
    const loader = substepLoaders[next];
    if (loader) preload(loader);
  }, [currentSub]);

  /* 9 ─── JSX ------------------------------------------------------- */
  return (
    <WizardFormWrapperStep2
      ref={handleFormWrapperRef}
      onHydrationComplete={handleFormHydration}
    >
      {parentLoading ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center
              bg-white/60 backdrop-blur-sm">
          <Skeleton className="w-48 h-6" />
        </div>
      ) : (
        <form className="step-budget-expenditure-container flex flex-col h-full">
          {/* Header navigation */}
          <div className="mb-6 flex items-center justify-between">
            {isSaving && (
              <div className="absolute inset-0 z-50 flex items-center justify-center
                            bg-white/60 backdrop-blur-sm">
                <Skeleton className="w-48 h-6" />
              </div>
            )}
            <div className="flex-1 text-center">
              {isMobile ? (
                <StepCarousel
                  steps={steps}
                  currentStep={currentSub - 1}
                />
              ) : (
                <WizardProgress
                  step={currentSub}
                  totalSteps={totalSteps}
                  steps={steps}
                  adjustProgress
                  onStepClick={clickProgress}
                />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <Suspense fallback={<LoadingScreen full={false} textColor="black" />}>
              <AnimatedContent
                animationKey={String(currentSub)}
                triggerKey={String(currentSub)}
              >
                {renderSubStep()}
              </AnimatedContent>
            </Suspense>
          </div>
        </form>
      )}
    </WizardFormWrapperStep2>
  );
});

export default StepBudgetExpenditureContainer;