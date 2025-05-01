import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  useForm,
  FormProvider,
  UseFormReturn,
  Resolver,
  FieldErrors,
} from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { wizardRootSchema } from '@schemas/wizard/wizardRootSchema';
import { ExpenditureFormValues } from '@/types/Wizard/ExpenditureFormValues';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';

/* ------------------------------------------------------------------ */
/*                  TYPES EXPOSED TO THE PARENT COMPONENT             */
/* ------------------------------------------------------------------ */
export interface WizardFormWrapperStep2Ref {
  validateFields: () => Promise<boolean>;
  getStepData: () => ExpenditureFormValues;
  getErrors: () => FieldErrors<ExpenditureFormValues>;
  getMethods: () => UseFormReturn<ExpenditureFormValues>;
}

interface WizardFormWrapperStep2Props {
  children: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*                       COMPONENT IMPLEMENTATION                     */
/* ------------------------------------------------------------------ */
const WizardFormWrapperStep2 = forwardRef<
  WizardFormWrapperStep2Ref,
  WizardFormWrapperStep2Props
>(({ children }, ref) => {
  /* ------------------------------------------------------------------ */
  /*                            HOOKS                                   */
  /* 1. ─── Grab slice + setter from Zustand */ 
  const {
    data: { expenditure },
    setExpenditure,
  } = useWizardDataStore();

  /* 2. ─── React-Hook-Form instance */
  const methods = useForm<ExpenditureFormValues>({
    resolver: yupResolver(wizardRootSchema) as unknown as Resolver<ExpenditureFormValues>,
    defaultValues: expenditure,          // hydrate from store
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldUnregister: false,
  });

  /* 3. ─── Sync every change back to the store */
  useEffect(() => {
    const sub = methods.watch(vals => setExpenditure(vals));
    return () => sub.unsubscribe();
  }, [methods, setExpenditure]);


  /* 4) Reset *once* when the external data first arrives */
  const hasHydrated = useRef(false);
  useEffect(() => {
    if (!hasHydrated.current && expenditure && Object.keys(expenditure).length > 0) {
      methods.reset(expenditure);
      hasHydrated.current = true;
    }
  }, [expenditure, methods]);

  /* 5. ─── Imperative API exposed to the parent */
  useImperativeHandle(ref, () => ({
    validateFields: () => methods.trigger(),
    getStepData:    () => methods.getValues(),
    getErrors:      () => methods.formState.errors,
    getMethods:     () => methods,
  }));

  /* 6. ─── Render subtree */
  return <FormProvider {...methods}>{children}</FormProvider>;
});

export default WizardFormWrapperStep2;
