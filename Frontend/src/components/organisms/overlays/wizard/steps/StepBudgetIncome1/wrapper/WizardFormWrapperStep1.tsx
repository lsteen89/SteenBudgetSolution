// WizardFormWrapperStep1.tsx
import React, { forwardRef, useImperativeHandle, useEffect, useRef, ReactNode } from "react";
import { useForm, FormProvider, UseFormReturn, FieldErrors, DeepPartial, FieldPath } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { isEqual } from "lodash";
import { shallow } from "zustand/shallow";

import { useWizardDataStore, WizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { IncomeFormValues } from "@/types/Wizard/Step1_Income/IncomeFormValues";
import { incomeStepSchema } from "@schemas/wizard/StepIncome/incomeStepSchema";
import useScrollToFirstError from "@/hooks/useScrollToFirstError";

import WizardSkeleton from "@/components/organisms/overlays/wizard/SharedComponents/Skeletons/WizardSkeleton";

export interface WizardFormWrapperStep1Ref {
  validateFields: () => Promise<boolean>;
  getStepData: () => IncomeFormValues;
  getErrors: () => FieldErrors<IncomeFormValues>;
  getMethods: () => UseFormReturn<IncomeFormValues>;
  markAllTouched: () => Promise<boolean>;
}

type Props = {
  children: ReactNode;

  // ✅ UI-only
  loading?: boolean;                 // parent/API hydration
  isSaving?: boolean;                // step transition saving
  skeletonVariant?: "intro" | "form" | "confirm";
};

const getLatestIncomeDataFromStore = () => useWizardDataStore.getState().data.income;

const WizardFormWrapperStep1 = forwardRef<WizardFormWrapperStep1Ref, Props>(
  ({ children, loading = false, isSaving = false, skeletonVariant = "form" }, ref) => {
    const { incomeStepData, setIncome } = useWizardDataStore(
      (state: WizardDataStore) => ({
        incomeStepData: state.data.income,
        setIncome: state.setIncome,
      }),
      shallow
    );

    const methods = useForm<IncomeFormValues>({
      resolver: yupResolver(incomeStepSchema) as any,
      defaultValues: {
        ...incomeStepData,
        salaryFrequency: incomeStepData.salaryFrequency ?? "monthly",
        incomePaymentDayType: incomeStepData.incomePaymentDayType ?? null,
        incomePaymentDay: incomeStepData.incomePaymentDay ?? null,
      },
      mode: "onBlur",
      reValidateMode: "onChange",
      shouldUnregister: false,
    });

    const { watch, reset, getValues, formState, trigger } = methods;

    useScrollToFirstError(formState.errors, formState.submitCount > 0);

    // Keep store in sync (only when not showing blocking overlay)
    useEffect(() => {
      const sub = watch((values: DeepPartial<IncomeFormValues>) => {
        if (loading || isSaving) return; // ✅ prevent churn during overlay
        const currentStoreData = getLatestIncomeDataFromStore();
        if (!isEqual(values, currentStoreData)) {
          setIncome(values as IncomeFormValues);
        }
      });
      return () => sub.unsubscribe();
    }, [watch, setIncome, loading, isSaving]);

    // One-time hydrate form from store
    const hasHydratedFromStoreRef = useRef(false);
    useEffect(() => {
      const storeData = incomeStepData;

      const isMeaningfulData =
        storeData &&
        Object.keys(storeData).length > 0 &&
        (storeData.netSalary !== undefined ||
          storeData.incomePaymentDayType !== undefined ||
          storeData.incomePaymentDay !== undefined ||
          (storeData.householdMembers && storeData.householdMembers.length > 0) ||
          (storeData.sideHustles && storeData.sideHustles.length > 0));

      if (!isMeaningfulData) return;

      const currentFormValues = getValues();
      if (!hasHydratedFromStoreRef.current && !isEqual(currentFormValues, storeData)) {
        reset(storeData as DeepPartial<IncomeFormValues>);
        hasHydratedFromStoreRef.current = true;
      }
    }, [incomeStepData, reset, getValues]);

    useImperativeHandle(ref, () => ({
      validateFields: async () => {
        const ok = await trigger(undefined, { shouldFocus: true });
        if (!ok) {
          await methods.handleSubmit(() => { }, () => { })(); // bump submitCount
        }
        return ok;
      },
      getStepData: () => getValues(),
      getErrors: () => formState.errors,
      getMethods: () => methods,
      markAllTouched: async () => {
        const ok = await trigger(undefined, { shouldFocus: true });
        if (!ok) {
          await methods.handleSubmit(() => { }, () => { })();
        }
        return ok;
      },
    }));

    const showOverlay = loading || isSaving;

    return (
      <FormProvider {...methods}>
        <div className="relative h-full">
          {children}

          {showOverlay && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm">
              <div className="w-[min(720px,95%)]">
                <WizardSkeleton
                  variant={skeletonVariant}
                  withProgress={false}
                  withFooter={false}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </FormProvider>
    );
  }
);

WizardFormWrapperStep1.displayName = "WizardFormWrapperStep1";
export default WizardFormWrapperStep1;
