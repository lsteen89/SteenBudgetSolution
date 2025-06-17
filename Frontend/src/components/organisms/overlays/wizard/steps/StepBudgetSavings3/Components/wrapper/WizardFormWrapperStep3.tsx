import React, { forwardRef, useImperativeHandle } from 'react';
import { useForm, FormProvider, UseFormReturn, FieldErrors } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { step3Schema, Step3FormValues } from '@/schemas/wizard/step3Schema';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';

export interface WizardFormWrapperStep3Ref {
  validateFields: () => Promise<boolean>;
  getStepData: () => Step3FormValues;
  getErrors: () => FieldErrors<Step3FormValues>;
  getMethods: () => UseFormReturn<Step3FormValues>;
}

interface WizardFormWrapperStep3Props {
  children: React.ReactNode;
}

const WizardFormWrapperStep3 = forwardRef<WizardFormWrapperStep3Ref, WizardFormWrapperStep3Props>(({ children }, ref) => {
  const { data: { savings } } = useWizardDataStore();

  const methods = useForm<Step3FormValues>({
    resolver: yupResolver(step3Schema),
    defaultValues: savings as Step3FormValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  useImperativeHandle(ref, () => ({
    validateFields: () => methods.trigger(),
    getStepData: () => methods.getValues(),
    getErrors: () => methods.formState.errors,
    getMethods: () => methods,
  }));

  return <FormProvider {...methods}>{children}</FormProvider>;
});

export default WizardFormWrapperStep3;
