import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  useForm,
  FormProvider,
  UseFormReturn,
  FieldErrors,
} from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import { step2Schema, Step2FormValues } from "@/schemas/wizard/step2Schema";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { ensureStep2Defaults } from "@/utils/ensureStep2Defaults";
import useScrollToFirstError from "@/hooks/useScrollToFirstError";

/* ───────────────── Types exposed to parent ───────────────── */
export interface WizardFormWrapperStep2Ref {
  validateFields: () => Promise<boolean>;
  getStepData  : () => Step2FormValues;
  getErrors    : () => FieldErrors<Step2FormValues>;
  getMethods   : () => UseFormReturn<Step2FormValues>;
}

interface WizardFormWrapperStep2Props {
  children: React.ReactNode;
}

/* ───────────────── Component ───────────────── */
const WizardFormWrapperStep2 = forwardRef<
  WizardFormWrapperStep2Ref,
  WizardFormWrapperStep2Props            
>(( { children }, ref ) => {
  /* 1.  Data from store */
  const {
    data: { expenditure },
  } = useWizardDataStore();

  /* 2.  Build defaults **after** we have the slice */
  const defaults = ensureStep2Defaults(
    expenditure as Partial<Step2FormValues>
  );
  /* 3.  RHF instance */
  const methods = useForm<Step2FormValues>({
    resolver: yupResolver(step2Schema),
    defaultValues: defaults,          // <- safe
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const { formState: { errors } } = methods;
  useScrollToFirstError(errors);
  /* 4.  Hydrate once if store updates later */
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      methods.reset(
        ensureStep2Defaults(expenditure as Partial<Step2FormValues>)
      );
      hydrated.current = true;
    }
  }, [expenditure, methods]);

  /* 5.  Imperative API */
  useImperativeHandle(ref, () => ({
    validateFields: () => methods.trigger(),
    getStepData   : () => methods.getValues(),
    getErrors     : () => methods.formState.errors,
    getMethods    : () => methods,
  }));

  /* 6.  Provide context */
  return (
    <FormProvider {...methods}>
      {children}
    </FormProvider>
  );
});

WizardFormWrapperStep2.displayName = 'WizardFormWrapperStep2';
export default WizardFormWrapperStep2;
