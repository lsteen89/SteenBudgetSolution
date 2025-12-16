import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useForm, FormProvider, UseFormReturn, FieldErrors } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { step4Schema } from '@/schemas/wizard/StepDebts/step4Schema';
import { Step4FormValues } from '@/types/Wizard/Step4FormValues';
import { ensureStep4Defaults } from '@/utils/wizard/ensureStep4Defaults';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import useScrollToFirstError from '@/hooks/useScrollToFirstError';
import { useWizard } from '@/context/WizardContext';
import { DebtsFormValues } from "@/types/Wizard/DebtFormValues";
import { devLog } from '@/utils/devLog';


export interface WizardFormWrapperStep4Ref {
  validateFields: () => Promise<boolean>;
  getStepData: () => Step4FormValues;
  getErrors: () => FieldErrors<Step4FormValues>;
  getMethods: () => UseFormReturn<Step4FormValues>;
}

interface WizardFormWrapperStep4Props {
  children: React.ReactNode;
  onHydrationComplete?: () => void;
}



const WizardFormWrapperStep4 = forwardRef<WizardFormWrapperStep4Ref, WizardFormWrapperStep4Props>(({ children, onHydrationComplete }, ref) => {
  const {
    data: { debts },
  } = useWizardDataStore();

  const defaults = ensureStep4Defaults(debts as Partial<Step4FormValues>);

  const { setWizardFlags } = useWizard();
  const methods = useForm<Step4FormValues>({
    resolver: yupResolver(step4Schema) as any,
    defaultValues: defaults,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  useImperativeHandle(ref, () => ({
    validateFields: () => methods.trigger(),
    getStepData: () => {
      const v = methods.getValues();
      devLog.group('Wrapper.getStepData', devLog.stamp({ values: v }));
      return v;
    },
    getErrors: () => methods.formState.errors,
    getMethods: () => methods,
  }));

  const { formState: { errors } } = methods;
  useScrollToFirstError(errors);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      methods.reset(ensureStep4Defaults(debts as Partial<Step4FormValues>));
      hydrated.current = true;
      onHydrationComplete?.();
    }
  }, [debts, methods, onHydrationComplete]);

  useEffect(() => {
    setWizardFlags({ debtsHaveBeenSet: (debts?.debts?.length ?? 0) > 0 });
  }, [debts, setWizardFlags]);

  return <FormProvider {...methods}>{children}</FormProvider>;
});

WizardFormWrapperStep4.displayName = 'WizardFormWrapperStep4';
export default WizardFormWrapperStep4;
