import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useForm, FormProvider, UseFormReturn, FieldErrors } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import { step3Schema } from "@/schemas/wizard/StepSavings/step3Schema";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import { ensureStep3Defaults } from "@/utils/wizard/ensureStep3Defaults";

import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import useScrollToFirstError from "@/hooks/useScrollToFirstError";
import { useWizard } from "@/context/WizardContext";

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

const WizardFormWrapperStep3 = forwardRef<
  WizardFormWrapperStep3Ref,
  WizardFormWrapperStep3Props
>(({ children, onHydrationComplete }, ref) => {
  const {
    data: { savings },
  } = useWizardDataStore();

  const { setWizardFlags } = useWizard();
  const hydratedFromStore = useRef(false);

  const methods = useForm<Step3FormValues>({
    resolver: yupResolver(step3Schema as any),
    defaultValues: ensureStep3Defaults(savings as Partial<Step3FormValues>),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldUnregister: false,
    shouldFocusError: true,
  });

  const {
    formState: { errors, submitCount, isDirty },
  } = methods;

  useScrollToFirstError(errors, submitCount > 0);

  // Track first successful sync so container can proceed
  const didSignalHydration = useRef(false);

  /**
   * ✅ Critical: whenever store slice changes (e.g., wizard reopened and DB data arrives),
   * reset the form IF the user hasn't started editing.
   */
  useEffect(() => {
    const shouldForceFirst = !hydratedFromStore.current;
    const canResync = !methods.formState.isDirty;

    if (shouldForceFirst || canResync) {
      methods.reset(ensureStep3Defaults(savings as Partial<Step3FormValues>), {
        keepErrors: true,
        keepTouched: true,
        keepDirty: true,
        keepSubmitCount: true,
      });
      hydratedFromStore.current = true;
      onHydrationComplete?.();
    }
  }, [savings, methods, onHydrationComplete]);

  // Sync context flags
  useEffect(() => {
    const g: any = (savings as any)?.goals;
    const goalsHaveBeenSet = Array.isArray(g) ? g.length > 0 : g != null;
    setWizardFlags({ goalsHaveBeenSet });
  }, [savings, setWizardFlags]);

  useImperativeHandle(ref, () => ({
    validateFields: () => methods.trigger(),
    getStepData: () => methods.getValues(),
    getErrors: () => methods.formState.errors,
    getMethods: () => methods,
  }));

  return <FormProvider {...methods}>{children}</FormProvider>;
});

WizardFormWrapperStep3.displayName = "WizardFormWrapperStep3";
export default WizardFormWrapperStep3;
