import { useWizard } from "@/context/WizardContext";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";
import type { GoalTemplate } from "@/types/modal/savings";
import { useFieldArray, useFormContext } from "react-hook-form";

export function useSavingsGoals() {
  const { control, getValues, setValue, formState } =
    useFormContext<Step3FormValues>();
  const { fields, append } = useFieldArray({
    control,
    name: "goals",
    keyName: "fieldId",
    shouldUnregister: false,
  });

  const { isActionBlocked, setIsActionBlocked, goalsHaveBeenSet } = useWizard();

  const openModal = () => setIsActionBlocked(true);
  const closeModal = () => setIsActionBlocked(false);

  const addBlank = () => {
    append({
      id: crypto.randomUUID(),
      name: "",
      targetAmount: null,
      targetDate: null,
      amountSaved: null,
      isFavorite: false,
    });
    closeModal();
  };

  const addFromTemplate = (template: GoalTemplate) => {
    append({
      id: crypto.randomUUID(),
      name: template.name,
      targetAmount: template.targetAmount,
      targetDate: template.targetDate ?? null,
      amountSaved: null,
      isFavorite: false,
    });
    closeModal();
  };

  // Your “hard reset remove” (keeps RHF clean)
  const removeAt = (indexToRemove: number) => {
    const current = getValues("goals") ?? []; // ✅ fix
    const next = current.filter((_, i) => i !== indexToRemove);
    setValue("goals", next, { shouldValidate: true, shouldDirty: true });
  };

  return {
    fields,
    errors: formState.errors,
    isActionBlocked,
    goalsHaveBeenSet,
    openModal,
    closeModal,
    addBlank,
    addFromTemplate,
    removeAt,
  };
}
