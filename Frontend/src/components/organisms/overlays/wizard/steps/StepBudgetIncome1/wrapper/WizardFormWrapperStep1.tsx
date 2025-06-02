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
  get, // For safely accessing nested error object properties
} from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { isEqual } from 'lodash'; // For reliable deep comparison
import { shallow } from 'zustand/shallow'; // For Zustand selector optimization

// Adjust paths as per your project structure
import { useWizardDataStore, WizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { IncomeFormValues } from '@myTypes/Wizard/IncomeFormValues';
import { incomeStepSchema } from '@schemas/wizard/incomeStepSchema';

/* ------------------------------------------------------------------ */
/* TYPES EXPOSED TO THE PARENT COMPONENT                              */
/* ------------------------------------------------------------------ */
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

// Helper function defined outside: gets LATEST state from store without causing re-render in dependent effects
const getLatestIncomeDataFromStore = () => useWizardDataStore.getState().data.income;

/* ------------------------------------------------------------------ */
/* COMPONENT IMPLEMENTATION                                           */
/* ------------------------------------------------------------------ */
const WizardFormWrapperStep1 = forwardRef<
  WizardFormWrapperStep1Ref,
  WizardFormWrapperStep1Props
>(({ children }, ref) => {
  /* 1. ─── Grab slice + setter from Zustand using shallow comparison */
  // This prevents re-renders if the selector returns a new object
  // but its top-level properties (incomeStepData, setIncome) haven't changed reference.
  const { incomeStepData, setIncome } = useWizardDataStore(
    (state: WizardDataStore) => ({
      incomeStepData: state.data.income,
      setIncome: state.setIncome,
    }),
    shallow
  );

  /* 2. ─── React-Hook-Form instance */
  const methods = useForm<IncomeFormValues>({
    resolver: yupResolver(incomeStepSchema) as unknown as Resolver<
      IncomeFormValues, any
    >,
    defaultValues: incomeStepData, // Hydrate from store; RHF handles DeepPartial
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldUnregister: false, // Keep form state even if fields unmount in conditional UI
  });

  // Destructure methods for stable references in useEffect dependency arrays
  const { control, watch, reset, getValues, formState, trigger, setFocus } = methods;

  /* 3. ─── Sync RHF changes back to the Zustand store */
  useEffect(() => {
    const subscription = watch(
      // Type the parameters for the watch callback
      (
        values: DeepPartial<IncomeFormValues>, // RHF watch can emit DeepPartial
        { name, type }: { name?: FieldPath<IncomeFormValues>; type?: string }
      ) => {
        const currentStoreData = getLatestIncomeDataFromStore();
        // Only update Zustand if the form values have actually changed
        if (!isEqual(values, currentStoreData)) {
          setIncome(values as IncomeFormValues); // Cast if sure 'values' is full shape here
        }
      }
    );
    return () => subscription.unsubscribe();
    // Dependencies are stable references from RHF and Zustand
  }, [control, watch, setIncome]);

  /* 4. ─── Hydrate/Reset RHF form if store data changes externally (e.g., initial API load) */
  const hasHydratedFromStoreRef = useRef(false);
  useEffect(() => {
    const storeData = incomeStepData; // Current store data from this render
    const isMeaningfulData =
      storeData &&
      Object.keys(storeData).length > 0 &&
      (storeData.netSalary !== undefined || // Or a more specific check like storeData.netSalary !== null
        (storeData.householdMembers && storeData.householdMembers.length > 0) ||
        (storeData.sideHustles && storeData.sideHustles.length > 0));

    if (isMeaningfulData) {
      const currentFormValues = getValues();
      // Only reset on the first meaningful data load if form hasn't already matched it
      if (!hasHydratedFromStoreRef.current && !isEqual(currentFormValues, storeData)) {
        reset(storeData as DeepPartial<IncomeFormValues>);
        hasHydratedFromStoreRef.current = true;
      }
    }
  }, [incomeStepData, reset, getValues]); // Stable dependencies from RHF & Zustand

  /* 5. ─── Imperative API exposed to the parent */
  useImperativeHandle(ref, () => ({
    validateFields: async () => {
      const isValid = await trigger(); // Validate all fields
      if (!isValid) {
        const currentErrors = formState.errors;
        const errorFieldNames = Object.keys(currentErrors) as Array<FieldPath<IncomeFormValues>>;

        if (errorFieldNames.length > 0) {
          const firstErrorFieldPath = errorFieldNames[0];
          try {
            // Step 1: Let RHF handle focusing the element first.
            // This is generally the most reliable way to get focus on the correct field.
            await setFocus(firstErrorFieldPath); // setFocus itself is not async, but give it a moment

            // Step 2: After RHF focuses, attempt to scroll the currently active element.
            // Use a small timeout to allow the DOM to update and focus to be applied.
            setTimeout(() => {
              const activeElement = document.activeElement;
              if (
                activeElement &&
                activeElement instanceof HTMLElement && // Check it's an HTMLElement
                typeof activeElement.scrollIntoView === 'function'
              ) {
                activeElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                  inline: 'nearest',
                });
              } else {
                console.warn(
                  `Focused element for ${String(firstErrorFieldPath)} could not be scrolled or was not an HTMLElement.`
                );
              }
            }, 500); // 50ms delay, can be adjusted or even 0.

          } catch (e) {
            console.error("Error during RHF setFocus or scroll attempt for:", String(firstErrorFieldPath), e);
            // If setFocus itself failed, it means RHF couldn't find/focus the field.
            // This might indicate an issue with field registration or the field path.
          }
        }
      }
      return isValid;
    },
    getStepData: () => getValues(),
    getErrors: () => formState.errors,
    getMethods: () => methods,
    markAllTouched: async () => {
      const isValid = await trigger();
      // If validation fails, validateFields logic (including focus/scroll) will be invoked
      // if the parent calls validateFields. If markAllTouched is called independently,
      // you might want to replicate the focus/scroll logic here too if needed.
      // For now, let's assume validateFields is the primary path for this.
      if (!isValid) {
          const currentErrors = formState.errors;
          const errorFieldNames = Object.keys(currentErrors) as Array<FieldPath<IncomeFormValues>>;
          if (errorFieldNames.length > 0) {
              const firstErrorFieldPath = errorFieldNames[0];
              await setFocus(firstErrorFieldPath); // At least focus it
               setTimeout(() => { // Optional: try to scroll here as well
                const activeElement = document.activeElement;
                if (activeElement && activeElement instanceof HTMLElement && typeof activeElement.scrollIntoView === 'function') {
                  activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 50);
          }
      }
      return isValid;
    },
  }));

  /* 6. ─── Render children within FormProvider */
  return <FormProvider {...methods}>{children}</FormProvider>;
});

WizardFormWrapperStep1.displayName = 'WizardFormWrapperStep1';
export default WizardFormWrapperStep1;