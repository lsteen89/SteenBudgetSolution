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
      console.log("WizardFormWrapperStep2 - Form State After Reset:", methods.getValues());
    },
    [methods] // Only depends on the stable 'methods' object
  );

  useEffect(() => {
    console.log("WizardFormWrapperStep2 - Initial Data:", initialData);
    resetForm(initialData);
  }, [initialData, resetForm]);

  // Reset form when initialData changes
  useEffect(() => {
    resetForm(initialData);
  }, [initialData, resetForm]); // Now depends on the stable resetForm

// Expose imperative methods via ref
useImperativeHandle(ref, () => ({
  validateFields: async () => {
    console.log("WizardFormWrapperStep2 - validateFields called. Current values:", methods.getValues());
    const isValid = await methods.trigger();
    console.log("WizardFormWrapperStep2 - validateFields result:", isValid, "Errors:", methods.formState.errors);
    return isValid;
  },
  getStepData: () => {
    const data = methods.getValues();
    console.log("WizardFormWrapperStep2 - getStepData called. Current values:", data);
    return data;
  },
  markAllTouched: () => {
    console.log("WizardFormWrapperStep2 - markAllTouched called. Current values before trigger:", methods.getValues());
    methods.trigger();
    console.log("WizardFormWrapperStep2 - markAllTouched finished. Current errors:", methods.formState.errors);
  },
  getErrors: () => {
    const errors = methods.formState.errors;
    console.log("WizardFormWrapperStep2 - getErrors called. Current errors:", errors);
    return errors;
  },
  getMethods: (): UseFormReturn<ExpenditureFormValues> => {
    console.log("WizardFormWrapperStep2 - getMethods requested.");
    return methods;
  },
}));
return <FormProvider {...methods}>{children}</FormProvider>;
});

export default WizardFormWrapperStep2;