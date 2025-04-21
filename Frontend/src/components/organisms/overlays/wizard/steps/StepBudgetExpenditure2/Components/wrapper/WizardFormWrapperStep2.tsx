// WizardFormWrapperStep2.tsx
import React, {
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
} from "react";
import {
  useForm,
  FormProvider,
  UseFormReturn,
  Resolver,
  FieldErrors,
} from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import { wizardRootSchema } from "@schemas/wizard/wizardRootSchema"; 
import { ExpenditureFormValues } from
  "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/interface/ExpenditureFormValues";

export interface WizardFormWrapperStep2Ref {
  validateFields: () => Promise<boolean>;
  getStepData: () => ExpenditureFormValues;
  markAllTouched: () => void;
  getErrors: () => FieldErrors<ExpenditureFormValues>;
  getMethods: () => UseFormReturn<ExpenditureFormValues>;
}

interface WizardFormWrapperStep2Props {
  initialData?: Partial<ExpenditureFormValues>;
  children: React.ReactNode;
  currentSubStep: number;
}

const WizardFormWrapperStep2 = forwardRef<
  WizardFormWrapperStep2Ref,
  WizardFormWrapperStep2Props
>(({ initialData, children, currentSubStep }, ref) => {
  /* ------------------------------------------------------------------ */
  /*                           1. SCHEMA & RESOLVER                     */
  /* ------------------------------------------------------------------ */
  const resolver = yupResolver(wizardRootSchema) as unknown as Resolver<ExpenditureFormValues>;

  /* ------------------------------------------------------------------ */
  /*                           2. RHF METHODS                           */
  /* ------------------------------------------------------------------ */
  const methods = useForm<ExpenditureFormValues>({
    resolver,
    defaultValues: {
      rent: {
        homeType:        initialData?.rent?.homeType        ?? "",
        monthlyRent:     initialData?.rent?.monthlyRent     ?? 0,
        rentExtraFees:   initialData?.rent?.rentExtraFees   ?? 0,
        monthlyFee:      initialData?.rent?.monthlyFee      ?? 0,
        brfExtraFees:    initialData?.rent?.brfExtraFees    ?? 0,
        houseotherCosts: initialData?.rent?.houseotherCosts ?? 0,
        mortgagePayment: initialData?.rent?.mortgagePayment ?? 0,
        otherCosts:      initialData?.rent?.otherCosts      ?? 0,
      },
      food: {
        foodStoreExpenses: initialData?.food?.foodStoreExpenses ?? 0,
        takeoutExpenses:   initialData?.food?.takeoutExpenses   ?? 0,
      },
      utilities: {
        electricity: initialData?.utilities?.electricity ?? 0,
        water:       initialData?.utilities?.water       ?? 0,
      },
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  /* ------------------------------------------------------------------ */
  /*                               3. RESET                             */
  /* ------------------------------------------------------------------ */
  const [isInitialized, setIsInitialized] = useState(false);

  const resetForm = useCallback(
    (data?: Partial<ExpenditureFormValues>) => {
      methods.reset({
        rent: {
          homeType:        data?.rent?.homeType        ?? "",
          monthlyRent:     data?.rent?.monthlyRent     ?? 0,
          rentExtraFees:   data?.rent?.rentExtraFees   ?? 0,
          monthlyFee:      data?.rent?.monthlyFee      ?? 0,
          brfExtraFees:    data?.rent?.brfExtraFees    ?? 0,
          houseotherCosts: data?.rent?.houseotherCosts ?? 0,
          mortgagePayment: data?.rent?.mortgagePayment ?? 0,
          otherCosts:      data?.rent?.otherCosts      ?? 0,
        },
        food: {
          foodStoreExpenses: data?.food?.foodStoreExpenses ?? 0,
          takeoutExpenses:   data?.food?.takeoutExpenses   ?? 0,
        },
        utilities: {
          electricity: data?.utilities?.electricity ?? 0,
          water:       data?.utilities?.water       ?? 0,
        },
      });
    },
    [methods],
  );

  /* ------------------------------------------------------------------ */
  /*                           4. SYNC INITIAL DATA                     */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!isInitialized) {
      resetForm(initialData);
      setIsInitialized(true);
      return;
    }

    const current = methods.getValues();

    const changed = JSON.stringify(current) !== JSON.stringify({
      rent:       initialData?.rent       ?? {},
      food:       initialData?.food       ?? {},
      utilities:  initialData?.utilities  ?? {},
    });

    if (changed) resetForm(initialData);
  }, [initialData, isInitialized, methods, resetForm]);

  /* ------------------------------------------------------------------ */
  /*                          5. IMPERATIVE API                         */
  /* ------------------------------------------------------------------ */
  useImperativeHandle(ref, () => ({
    validateFields: async () => methods.trigger(),
    getStepData:    () => methods.getValues(),
    markAllTouched: () => void methods.trigger(),
    getErrors:      () => methods.formState.errors,
    getMethods:     () => methods,
  }));

  /* ------------------------------------------------------------------ */
  /*                               RENDER                               */
  /* ------------------------------------------------------------------ */
  return <FormProvider {...methods}>{children}</FormProvider>;
});

export default WizardFormWrapperStep2;
