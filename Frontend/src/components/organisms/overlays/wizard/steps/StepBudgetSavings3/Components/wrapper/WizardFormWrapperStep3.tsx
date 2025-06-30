import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useForm, FormProvider, UseFormReturn, FieldErrors } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

// --- Added: Import the schema and defaults utility ---
import { step3Schema } from '@/schemas/wizard/StepSavings/step3Schema';
import { Step3FormValues } from '@/types/Wizard/Step3FormValues';
import { ensureStep3Defaults } from "@/utils/wizard/ensureStep3Defaults";

import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import useScrollToFirstError from "@/hooks/useScrollToFirstError";
import { useWizard } from '@/context/WizardContext';

export interface WizardFormWrapperStep3Ref {
  validateFields: () => Promise<boolean>;
  getStepData: () => Step3FormValues;
  getErrors: () => FieldErrors<Step3FormValues>;
  getMethods: () => UseFormReturn<Step3FormValues>;
}

interface WizardFormWrapperStep3Props {
  children: React.ReactNode;
  onHydrationComplete?: () => void;
}
console.log('%c[Wrapper] WizardFormWrapperStep3 rendering/mounting.', 'color: orange;');
const WizardFormWrapperStep3 = forwardRef<
  WizardFormWrapperStep3Ref,
  WizardFormWrapperStep3Props
>(({ children, onHydrationComplete }, ref) => {
  // 1. Data from store (unchanged)
  const {
    data: { savings },
  } = useWizardDataStore();
  
  const { setWizardFlags } = useWizard();
  // 2. --- Added: Build safe defaults BEFORE initializing the form ---
  const defaults = ensureStep3Defaults(savings as Partial<Step3FormValues>);

  // 3. RHF instance
  const methods = useForm<Step3FormValues>({
    resolver: yupResolver(step3Schema as any),
    defaultValues: defaults, // <-- Changed: Use safe defaults
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });


  const {
    formState: { errors },
  } = methods;
  useScrollToFirstError(errors);

  // 4. --- Added: Hydration logic to handle async store updates ---
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      methods.reset(
        ensureStep3Defaults(savings as Partial<Step3FormValues>)
      );
      hydrated.current = true;
      onHydrationComplete?.();
    }
  }, [savings, methods, onHydrationComplete]);

  useEffect(() => {
    console.log('%c[Wrapper] Syncing context flag. The value is:', savings?.goals != null, 'color: purple;');
    setWizardFlags({ 
      goalsHaveBeenSet: savings?.goals != null 
    });
  }, [savings, setWizardFlags]);


  // 5. Imperative API (unchanged)
  useImperativeHandle(ref, () => ({
    validateFields: () => methods.trigger(),
    getStepData: () => methods.getValues(),
    getErrors: () => methods.formState.errors,
    getMethods: () => methods,
  }));

  // 6. Provide context (unchanged)
  return <FormProvider {...methods}>{children}</FormProvider>;
});

// --- Added: Display name for better React DevTools experience ---
WizardFormWrapperStep3.displayName = 'WizardFormWrapperStep3';

export default WizardFormWrapperStep3;