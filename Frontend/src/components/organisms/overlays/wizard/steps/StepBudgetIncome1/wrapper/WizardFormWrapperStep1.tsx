import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import {
  useForm,
  FormProvider,
  UseFormReturn,
  FieldErrors,
  Resolver,
  DeepPartial,
  FieldPath,
  get,
} from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { isEqual } from 'lodash';
import { shallow } from 'zustand/shallow';

import { useWizardDataStore, WizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { IncomeFormValues } from '@myTypes/Wizard/IncomeFormValues';
import { incomeStepSchema } from '@schemas/wizard/incomeStepSchema';
import useScrollToFirstError from '@/hooks/useScrollToFirstError';

export interface WizardFormWrapperStep1Ref {
  validateFields: () => Promise<boolean>;
  getStepData: () => IncomeFormValues;
  getErrors: () => FieldErrors<IncomeFormValues>;
  getMethods: () => UseFormReturn<IncomeFormValues>;
  markAllTouched: () => Promise<boolean>;
}

interface WizardFormWrapperStep1Props {
  children: ReactNode;
}

const getLatestIncomeDataFromStore = () => useWizardDataStore.getState().data.income;

const WizardFormWrapperStep1 = forwardRef<
  WizardFormWrapperStep1Ref,
  WizardFormWrapperStep1Props
>(({ children }, ref) => {
  const { incomeStepData, setIncome } = useWizardDataStore(
    (state: WizardDataStore) => ({
      incomeStepData: state.data.income,
      setIncome: state.setIncome,
    }),
    shallow
  );

  const methods = useForm<IncomeFormValues>({
    resolver: yupResolver(incomeStepSchema) as unknown as Resolver<
      IncomeFormValues, any
    >,
    defaultValues: incomeStepData,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldUnregister: false,
  });

  const { control, watch, reset, getValues, formState, trigger, setFocus } = methods;

  // Scroll to the first error whenever validation fails
  useScrollToFirstError(formState.errors);


  useEffect(() => {
    const subscription = watch(
      (
        values: DeepPartial<IncomeFormValues>,
        { name, type }: { name?: FieldPath<IncomeFormValues>; type?: string }
      ) => {
        const currentStoreData = getLatestIncomeDataFromStore();
        if (!isEqual(values, currentStoreData)) {
          setIncome(values as IncomeFormValues);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [control, watch, setIncome]);

  const hasHydratedFromStoreRef = useRef(false);
  useEffect(() => {
    const storeData = incomeStepData;
    const isMeaningfulData =
      storeData &&
      Object.keys(storeData).length > 0 &&
      (storeData.netSalary !== undefined ||
        (storeData.householdMembers && storeData.householdMembers.length > 0) ||
        (storeData.sideHustles && storeData.sideHustles.length > 0));

    if (isMeaningfulData) {
      const currentFormValues = getValues();
      if (!hasHydratedFromStoreRef.current && !isEqual(currentFormValues, storeData)) {
        reset(storeData as DeepPartial<IncomeFormValues>);
        hasHydratedFromStoreRef.current = true;
      }
    }
  }, [incomeStepData, reset, getValues]);

  useImperativeHandle(ref, () => ({
    // 👇 Simply trigger validation; the hook will handle scrolling
    validateFields: async () => {
      return await trigger();
    },
    getStepData: () => getValues(),
    getErrors: () => formState.errors,
    getMethods: () => methods,
    // 👇 trigger() is sufficient here as well
    markAllTouched: async () => {
      return await trigger();
    },
  }));

  return <FormProvider {...methods}>{children}</FormProvider>;
});

WizardFormWrapperStep1.displayName = 'WizardFormWrapperStep1';
export default WizardFormWrapperStep1;
