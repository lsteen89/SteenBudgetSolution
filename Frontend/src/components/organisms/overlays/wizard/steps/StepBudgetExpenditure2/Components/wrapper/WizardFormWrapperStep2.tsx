import React, { useEffect, forwardRef, useImperativeHandle, useCallback, useState } from "react";
import { useForm, FormProvider, UseFormReturn } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
// schemas
import { getSchemaForStep } from "@schemas/wizard/schemaUtils";

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
  currentSubStep: number;
}


const WizardFormWrapperStep2 = forwardRef<
  WizardFormWrapperStep2Ref,
  WizardFormWrapperStep2Props
>(({ initialData, children, currentSubStep }, ref) => {

  const selectedSchema = getSchemaForStep(currentSubStep);


  const methods = useForm<ExpenditureFormValues>({
    resolver: yupResolver(selectedSchema),
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
  const [isInitialized, setIsInitialized] = useState(false);
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
    const currentValues = methods.getValues();
    console.log("WizardFormWrapperStep2 - useEffect - currentValues:", currentValues); // ADD THIS
    // Function to check if two food objects are different
    interface FoodData {
      foodStoreExpenses?: number | null;
      takeoutExpenses?: number | null;
    }

    const areFoodDataDifferent = (data1: FoodData | undefined, data2: FoodData | undefined): boolean => {
      return (
      data1?.foodStoreExpenses !== (data2?.foodStoreExpenses ?? 0) ||
      data1?.takeoutExpenses !== (data2?.takeoutExpenses ?? 0)
      );
    };

    // Function to check if two rent objects are different (add more fields as needed)
    interface RentData {
      homeType?: string;
      monthlyRent?: number;
      rentExtraFees?: number | null;
      monthlyFee?: number;
      brfExtraFees?: number | null;
      houseotherCosts?: number | null;
      mortgagePayment?: number;
      otherCosts?: number | null;
    }

    const areRentDataDifferent = (data1: RentData | undefined, data2: RentData | undefined): boolean => {
      return (
      data1?.homeType !== (data2?.homeType ?? "") ||
      data1?.monthlyRent !== (data2?.monthlyRent ?? 0) ||
      data1?.rentExtraFees !== (data2?.rentExtraFees ?? 0) ||
      data1?.monthlyFee !== (data2?.monthlyFee ?? 0) ||
      data1?.brfExtraFees !== (data2?.brfExtraFees ?? 0) ||
      data1?.houseotherCosts !== (data2?.houseotherCosts ?? 0) ||
      data1?.mortgagePayment !== (data2?.mortgagePayment ?? 0) ||
      data1?.otherCosts !== (data2?.otherCosts ?? 0)
      );
    };

    interface UtilitiesData {
      electricity?: number | null;
      water?: number | null;
    }

    const areUtilitiesDataDifferent = (
      data1: UtilitiesData | undefined,
      data2: UtilitiesData | undefined
    ): boolean => {
      return (
      (data1?.electricity ?? undefined) !== (data2?.electricity ?? 0) ||
      (data1?.water ?? undefined) !== (data2?.water ?? 0)
      );
    };

    if (initialData) {
      if (
        areRentDataDifferent(initialData.rent, currentValues.rent) ||
        areFoodDataDifferent(initialData.food, currentValues.food) ||
        areUtilitiesDataDifferent(initialData.utilities, currentValues.utilities)
      ) {
        resetForm(initialData);
      }
      if (!isInitialized) {
        setIsInitialized(true);
      }
    } else if (!isInitialized) {
      resetForm(undefined); // Handle initial empty state
      setIsInitialized(true);
    }
  }, [initialData, resetForm, methods, isInitialized]);

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