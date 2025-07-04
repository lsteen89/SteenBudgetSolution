import React, { forwardRef, useImperativeHandle } from 'react';
import { useForm, FormProvider, UseFormReturn, FieldErrors } from 'react-hook-form';
import { Step5FormValues } from '@/types/Wizard/Step5FormValues';

export interface WizardFormWrapperStep5Ref {
  validateFields: () => Promise<boolean>;
  getStepData: () => Step5FormValues;
  getErrors: () => FieldErrors<Step5FormValues>;
  getMethods: () => UseFormReturn<Step5FormValues>;
}

interface WizardFormWrapperStep5Props {
  children: React.ReactNode;
}

const WizardFormWrapperStep5 = forwardRef<WizardFormWrapperStep5Ref, WizardFormWrapperStep5Props>(({ children }, ref) => {
  const methods = useForm<Step5FormValues>({ defaultValues: {} as Step5FormValues });

  useImperativeHandle(ref, () => ({
    validateFields: () => Promise.resolve(true),
    getStepData: () => methods.getValues(),
    getErrors: () => methods.formState.errors,
    getMethods: () => methods,
  }));

  return <FormProvider {...methods}>{children}</FormProvider>;
});

WizardFormWrapperStep5.displayName = 'WizardFormWrapperStep5';
export default WizardFormWrapperStep5;
