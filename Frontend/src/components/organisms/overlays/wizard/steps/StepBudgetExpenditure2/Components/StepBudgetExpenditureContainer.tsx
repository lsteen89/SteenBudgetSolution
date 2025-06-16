import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  FormProvider,
  FieldErrors,
  UseFormReturn,
} from 'react-hook-form';

import { Step2FormValues }       from '@/schemas/wizard/step2Schema';
import WizardFormWrapperStep2, {
  WizardFormWrapperStep2Ref,
} from './wrapper/WizardFormWrapperStep2';

/*Substeps for major step 2*/
// Step 1
import ExpenditureOverviewMainText from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/1_SubStepWelcome/ExpenditureOverviewMainText';
// Step 1
import SubStepRent  from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/2_SubStepRent/SubStepRent';

import SubStepFood  from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/3_SubStepFood/SubStepFood';
import SubStepFixedExp from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/4_SubStepFixedExpenses/SubStepFixedExpenses';
import SubStepTransport from '@/components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/5_SubStepTransport/SubStepTransport';
import SubStepClothing from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/6_SubStepClothing/SubStepClothing';
import SubStepSubscriptions from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/7_SubStepSubscriptions/SubStepSubscriptions';
import SubStepConfirm from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/8_SubStepConfirm/SubStepConfirm';

import LoadingScreen from '@components/molecules/feedback/LoadingScreen';

import AnimatedContent from '@components/atoms/wrappers/AnimatedContent';
import StepButton      from '@components/molecules/buttons/StepButton';
import WizardProgress  from '@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress';
import StepCarousel    from '@components/molecules/progress/StepCarousel';
import WizardNavPair   from '@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardNavPair';

import useMediaQuery  from '@hooks/useMediaQuery';
import { useSaveStepData } from '@hooks/wizard/useSaveStepData';
import { ensureStep2Defaults } from "@/utils/ensureStep2Defaults";


import {
  Info, Home, FileText, Utensils, Car,
  Shirt, CreditCard, ShieldCheck,
} from 'lucide-react';

import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';

/* ------------------------------------------------------------------ */
/*                            INTERFACES                              */
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
}

/* ------------------------------------------------------------------ */
/*                        COMPONENT IMPLEMENTATION                     */
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
  const [showShakeAnimation, setShowShakeAnimation] = useState(false);
  const triggerShakeAnimation = (duration = 1000) => {
    setShowShakeAnimation(true);
    setTimeout(() => setShowShakeAnimation(false), duration);
  };

  /* 1 ─── Hydrate slice once --------------------------------------- */
  const { setExpenditure } = useWizardDataStore();
  useEffect(() => {
    if (initialData) setExpenditure(initialData);  // DeepPartial merge
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  /* 2 ─── refs & local state --------------------------------------- */
  const formWrapperRef = useRef<WizardFormWrapperStep2Ref>(null);

  const [isSaving,     setIsSaving]     = useState(false);
  const [currentSub,   setCurrentSub]   = useState(initialSubStep || 1);
  const [formMethods, setFormMethods] =
    useState<UseFormReturn<Step2FormValues> | null>(null);


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
    onError: () => triggerShakeAnimation(1000),
  });

  /* 4 ─── navigation helpers --------------------------------------- */
  const totalSteps = 8;
  const goToSub = async (dest: number) => {
    const goingBack      = dest < currentSub;
    const skipValidation = currentSub === 1 || goingBack;
    console.log('Current sub-step:', currentSub);
    setIsSaving(true);
    await saveStepData(currentSub, dest, skipValidation, goingBack);
    setIsSaving(false);
  };

  const next = () => {
    console.log('current sub-step:', currentSub);
    console.log('total steps:', totalSteps);
    if (currentSub === 1)     return setCurrentSub(2);
    if (currentSub === totalSteps)
      return isMobile ? goToSub(1) : onNext();
    goToSub(currentSub + 1);
  };
  const prev = () => {
    if (currentSub === 1)
      return isMobile ? goToSub(totalSteps) : onPrev();
    goToSub(currentSub - 1);
  };

  /* 5 ─── progress click handlers ---------------------------------- */
  const clickCarousel = (z: number) => goToSub(z + 1);
  const clickProgress = (d: number) => goToSub(d);

  /* 6 ─── notify parent of sub-step -------------------------------- */
  useEffect(() => props.onSubStepChange?.(currentSub), [currentSub]);

  // Scroll to top whenever a sub-step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentSub]);

  /* 7 ─── imperative API ------------------------------------------- */
  useImperativeHandle(ref, () => ({
    validateFields: () => formMethods?.trigger() ?? Promise.resolve(false),
  getStepData   : () => formMethods?.getValues() ?? ensureStep2Defaults({}),
    markAllTouched: () => formMethods?.trigger(),
    getErrors:      () => formMethods?.formState.errors ?? {},
    getCurrentSubStep: () => currentSub,
    goPrevSub: prev,
    goNextSub: next,
    hasPrevSub: () => currentSub > 1,
    hasNextSub: () => currentSub < totalSteps,
    isSaving: () => isSaving,
  }));

  /* 8 ─── render helpers ------------------------------------------- */
  const steps = [
    { icon: Info,  label: 'Översikt' },
    { icon: Home,  label: 'Boende' },
    { icon: Utensils, label: 'Matkostnader' },
    { icon: FileText, label: 'Fasta utgifter' },
    { icon: Car,   label: 'Transport' },
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
      // Add more cases for other sub-steps as needed
      default:return <div>All sub-steps complete!</div>;
    }
  };
  
  /* 9 ─── JSX ------------------------------------------------------- */
  return (
    <WizardFormWrapperStep2 ref={handleFormWrapperRef}>
      {parentLoading ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center
              bg-white/60 backdrop-blur-sm">
          <LoadingScreen full={true}  textColor="black" />
        </div>
      ) : (
        <form className="step-budget-expenditure-container flex flex-col h-full">
          {/* Header navigation */}
          <div className="mb-6 flex items-center justify-between">
            {isSaving && (
              <div className="absolute inset-0 z-50 flex items-center justify-center
                            bg-white/60 backdrop-blur-sm">
                <LoadingScreen 
                  full={false}          
                  actionType="save"    
                  textColor="black"     
                />
              </div>
            )}
            {isMobile && <StepButton isLeft onClick={prev} />}
            <div className="flex-1 text-center">
              {isMobile ? (
                <StepCarousel
                  steps={steps}
                  currentStep={currentSub - 1}
                  onStepClick={clickCarousel}
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
            {isMobile && <StepButton isLeft={false} onClick={next} />}
          </div>

          {/* Content */}
          <div className="flex-1">
            <AnimatedContent animationKey={currentSub}>
              {renderSubStep()}
            </AnimatedContent>
          </div>

          {/* Desktop nav */}
          {!isMobile && (
            <div className="my-6 w-full flex items-center justify-between">
              <WizardNavPair
                step={currentSub}
                prevStep={prev}
                nextStep={next}
                hasPrev={currentSub > 1}
                hasNext={currentSub < totalSteps}
                connectionError={false}
                initLoading={false}
                transitionLoading={false}
                isDebugMode={false}
                showShakeAnimation={showShakeAnimation}
                isMajor={false}
                isSaving={isSaving}
              />
            </div>
          )}
        </form>
      )}
    </WizardFormWrapperStep2>
  );
});

export default StepBudgetExpenditureContainer;
