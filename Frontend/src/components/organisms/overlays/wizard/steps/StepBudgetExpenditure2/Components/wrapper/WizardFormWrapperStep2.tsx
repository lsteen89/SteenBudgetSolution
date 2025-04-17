import React, { useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { useForm, FormProvider, UseFormReturn } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { wizardRootSchema } from "@schemas/wizard/wizardRootSchema";
import { ExpenditureFormValues } from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/interface/ExpenditureFormValues";
import { FieldErrors } from "react-hook-form";

export interface WizardFormWrapperStep2Ref {
  validateFields: () => Promise<boolean>;
  getStepData: () => any;
  markAllTouched: () => void;
  getErrors: () => FieldErrors<ExpenditureFormValues>;
  getMethods: () => UseFormReturn<ExpenditureFormValues>;
}

interface WizardFormWrapperStep2Props {
  initialData?: Partial<ExpenditureFormValues>;
  children: React.ReactNode;
}

const WizardFormWrapperStep2 = forwardRef<
  WizardFormWrapperStep2Ref,
  WizardFormWrapperStep2Props
>(({ initialData, children }, ref) => {
  const methods = useForm<ExpenditureFormValues>({
    resolver: yupResolver(wizardRootSchema),
    defaultValues: {
      rent: {
        homeType: initialData?.rent?.homeType ?? "",
        monthlyRent: initialData?.rent?.monthlyRent ?? 0,
        rentExtraFees: initialData?.rent?.rentExtraFees ?? 0,
        monthlyFee: initialData?.rent?.monthlyFee ?? 0,
        brfExtraFees: initialData?.rent?.brfExtraFees ?? 0,
        houseotherCosts: initialData?.rent?.houseotherCosts ?? 0,
        mortgagePayment: initialData?.rent?.mortgagePayment ?? 0,
        otherCosts: initialData?.rent?.otherCosts ?? 0,
      },
      food: {
        foodStoreExpenses: initialData?.food?.foodStoreExpenses ?? 0,
        takeoutExpenses: initialData?.food?.takeoutExpenses ?? 0,
      },
      utilities: {
        electricity: 0,
        water: 0,
      },
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  // Create a stable resetForm function
  const resetForm = useCallback(
    (data: Partial<ExpenditureFormValues> | undefined) => {
      methods.reset({
        rent: {
          homeType: data?.rent?.homeType ?? "",
          monthlyRent: data?.rent?.monthlyRent ?? 0,
          rentExtraFees: data?.rent?.rentExtraFees ?? 0,
          monthlyFee: data?.rent?.monthlyFee ?? 0,
          brfExtraFees: data?.rent?.brfExtraFees ?? 0,
          houseotherCosts: data?.rent?.houseotherCosts ?? 0,
          mortgagePayment: data?.rent?.mortgagePayment ?? 0,
          otherCosts: data?.rent?.otherCosts ?? 0,
        },
        food: {
          foodStoreExpenses: data?.food?.foodStoreExpenses ?? 0,
          takeoutExpenses:   data?.food?.takeoutExpenses   ?? 0,
        },
        utilities: {
          electricity: 0,
          water: 0,
        },

      });
    },
    [methods] // Only depends on the stable 'methods' object
  );

  // Reset form when initialData changes
  useEffect(() => {
    resetForm(initialData);
  }, [initialData, resetForm]); // Now depends on the stable resetForm

  // Expose imperative methods via ref
  useImperativeHandle(ref, () => ({
    validateFields: async () => methods.trigger(),
    getStepData: () => methods.getValues(),
    markAllTouched: () => methods.trigger(),
    getErrors: () => methods.formState.errors,
    getMethods: (): UseFormReturn<ExpenditureFormValues> => methods,
  }));
  return <FormProvider {...methods}>{children}</FormProvider>;
});

export default WizardFormWrapperStep2;