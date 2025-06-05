import React, { useEffect } from "react";
import { useFormContext, useFieldArray, Controller } from "react-hook-form"; // Controller is now used
import { PlusCircle, Trash2 } from "lucide-react"; // HelpCircle not used directly here anymore

// Components
import OptionContainer from "@components/molecules/containers/OptionContainer";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import TextInput from "@components/atoms/InputField/TextInput"; // Assuming this is the updated version accepting className
import HelpSection from "@components/molecules/helptexts/HelpSection";
// import Button from "@components/atoms/buttons/GoodButton"; // No longer using GoodButton
import SubmitButton from "@components/atoms/buttons/SubmitButton"; // Using SubmitButton

// Types
export interface FixedExpenseItem {
  id?: string;
  name?: string;
  fee?: number | null;
}

export interface FixedExpensesSubForm {
  insurance?: number | null;
  electricity?: number | null;
  internet?: number | null;
  phone?: number | null;
  unionFees?: number | null;
  customExpenses?: (FixedExpenseItem | undefined)[];
}

const generateUniqueId = () => `custom_${new Date().getTime()}_${Math.random().toString(36).substring(2, 7)}`;

const SubStepFixedExpenses: React.FC = () => {
  const {
    control, // control is used by useFieldArray and Controller
    // register, // No longer directly using register for TextInput here
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<{ fixedExpenses: FixedExpensesSubForm }>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fixedExpenses.customExpenses",
  });

  const insuranceVal = watch("fixedExpenses.insurance");
  const electricityVal = watch("fixedExpenses.electricity");
  const internetVal = watch("fixedExpenses.internet");
  const phoneVal = watch("fixedExpenses.phone");
  const unionFeesVal = watch("fixedExpenses.unionFees");
  const customExpensesVal = watch("fixedExpenses.customExpenses");

  const calculatedTotalValue =
    (insuranceVal ?? 0) +
    (electricityVal ?? 0) +
    (internetVal ?? 0) +
    (phoneVal ?? 0) +
    (unionFeesVal ?? 0) +
    (customExpensesVal?.reduce((acc, expenseItem) => acc + (expenseItem?.fee ?? 0), 0) ?? 0);

  const formattedTotalValue = calculatedTotalValue.toLocaleString("sv-SE");

  useEffect(() => {
    if (!customExpensesVal || customExpensesVal.length === 0) {
      // append({ id: generateUniqueId(), name: "", fee: null }); // Optional
    }
  }, [customExpensesVal, append]);

  const commonExpenseFields = [
    {
      name: "insurance" as const,
      label: "Försäkringar",
      placeholder: "t.ex. 300 kr",
      helpText: "Ange dina totala månatliga kostnader för försäkringar (hem, bil, person etc.).",
    },
    {
      name: "electricity" as const,
      label: "El",
      placeholder: "t.ex. 500 kr",
      helpText: "Din månadskostnad för el. Kan variera, ange ett snitt.",
    },
    {
      name: "internet" as const,
      label: "Internet",
      placeholder: "t.ex. 400 kr",
      helpText: "Månadskostnad för bredband och eventuellt mobilt bredband.",
    },
    {
      name: "phone" as const,
      label: "Telefoni",
      placeholder: "t.ex. 250 kr",
      helpText: "Månadskostnad för mobilabonnemang och/eller fast telefoni.",
    },
    {
      name: "unionFees" as const,
      label: "Fackföreningsavgift",
      placeholder: "t.ex. 350 kr",
      helpText: "Din månatliga avgift till fackförbund och/eller A-kassa.",
    },
  ];

  return (
    <OptionContainer>
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-white">Fasta Månadskostnader</h2>
          <p className="text-sm text-gray-300">
            Ange dina regelbundna fasta utgifter varje månad.
          </p>
        </div>

        <div className="bg-white bg-opacity-10 p-4 md:p-6 rounded-xl shadow-inner space-y-6">
          {/* Predefined Expenses */}
          <div className="grid md:grid-cols-2 gap-6">
            {commonExpenseFields.map((fieldInfo) => (
              <div key={fieldInfo.name}>
                <div className="flex items-center justify-center mb-2">
                  <label htmlFor={`fixedExpenses.${fieldInfo.name}`} className="flex items-center text-white font-semibold">
                    {fieldInfo.label}
                  </label>
                  <HelpSection className="ml-2" label="" helpText={fieldInfo.helpText} />
                </div>
                <FormattedNumberInput
                  id={`fixedExpenses.${fieldInfo.name}`}
                  value={watch(`fixedExpenses.${fieldInfo.name}`) ?? 0}
                  onValueChange={(val) => setValue(`fixedExpenses.${fieldInfo.name}`, val ?? null, { shouldValidate: true, shouldDirty: true })}
                  placeholder={fieldInfo.placeholder}
                  error={errors.fixedExpenses?.[fieldInfo.name]?.message}
                  name={`fixedExpenses.${fieldInfo.name}`}
                />
              </div>
            ))}
          </div>

          {/* Custom Expenses */}
          <div className="mt-6 pt-6 border-t border-gray-500 border-opacity-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Egna Fasta Utgifter</h3>
              <SubmitButton
                isSubmitting={false}
                onClick={() => append({ id: generateUniqueId(), name: "", fee: null })}
                icon={<PlusCircle size={18} />} // Using icon prop
                label="Lägg till Egen Utgift"    // Using label prop
                type="button"
                size="default" // Example size
                className="text-sm" // Added some custom styling to match previous visual if needed
                                    // SubmitButton has `inline-flex items-center justify-center`
                                    // so "flex items-center" might be redundant from previous code
                                    // You can adjust className for specific styling needs.
                                    // Example: `className="px-4 py-2"` for custom padding
              />
            </div>

            {fields.length === 0 && (
              <p className="text-center text-gray-400 text-sm">
                Du har inte lagt till några egna fasta utgifter än.
              </p>
            )}

            <div className="space-y-4">
              {fields.map((item, index) => (
                <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center gap-3 p-3 bg-white bg-opacity-5 rounded-lg">
                  <div className="flex-grow w-full md:w-auto">
                    <label htmlFor={`fixedExpenses.customExpenses.${index}.name`} className="sr-only">Namn på utgift</label>
                    <Controller
                      name={`fixedExpenses.customExpenses.${index}.name` as const}
                      control={control}
                      rules={{ required: "Namn får inte vara tomt" }}
                      defaultValue={item.name || ""} 
                      render={({ field, fieldState }) => (
                        <TextInput
                          id={`fixedExpenses.customExpenses.${index}.name`}
                          placeholder="Namn på utgift (t.ex. Streaming, Gym)"
                          // Spread other field props like onChange, onBlur, name, ref
                          // BUT explicitly provide 'value' to ensure it's a string.
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          value={field.value ?? ''} 
                          error={fieldState.error?.message}
                          className="w-full"
                          // touched={fieldState.isTouched} // Still an option if TextInput uses it
                        />
                      )}
                    />
                  </div>
                  <div className="w-full md:w-auto md:max-w-[200px]">
                    <label htmlFor={`fixedExpenses.customExpenses.${index}.fee`} className="sr-only">Belopp</label>
                    {/* For FormattedNumberInput, we are still using watch/setValue,
                        If it were to be used with Controller, similar changes would apply.
                        For now, assuming it works as intended. */}
                    <FormattedNumberInput
                      id={`fixedExpenses.customExpenses.${index}.fee`}
                      value={watch(`fixedExpenses.customExpenses.${index}.fee`) ?? 0}
                      onValueChange={(val) => setValue(`fixedExpenses.customExpenses.${index}.fee`, val ?? null, { shouldValidate: true, shouldDirty: true })}
                      placeholder="Belopp"
                      error={errors.fixedExpenses?.customExpenses?.[index]?.fee?.message}
                      name={`fixedExpenses.customExpenses.${index}.fee`}
                    />
                  </div>
                  <SubmitButton
                    isSubmitting={false}
                    onClick={() => remove(index)}
                    icon={<Trash2 size={18} />}
                    label="" // No label text, SubmitButton might render default "Submit" if not handled
                    type="button"
                    aria-label="Ta bort utgift"
                    size="small" // Good size for an icon-only button
                    // For DANGER styling: override SubmitButton's default green
                    // These classes will be appended to SubmitButton's classes.
                    // Order and specificity matter with Tailwind.
                    className="p-2 self-center md:self-center !bg-red-600 hover:!bg-red-700 focus:!ring-red-500 text-white"
                    // enhanceOnHover={false} // Default is false, probably don't want blue hover on danger
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Total Sum */}
          <div className="mt-8 pt-4 border-t border-gray-500 border-opacity-50">
            <p className="text-white text-lg text-center font-semibold">
              Totala Fasta Månadskostnader: <strong>{formattedTotalValue} kr</strong>
            </p>
            {errors.fixedExpenses && typeof errors.fixedExpenses.message === 'string' && (
              <p className="mt-2 text-red-400 text-sm text-center">
                {errors.fixedExpenses.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </OptionContainer>
  );
};

export default SubStepFixedExpenses;