import React, { ChangeEvent, FocusEvent } from "react";
import { useFormattedNumber } from "@hooks/useFormattedNumber";

interface FormattedNumberInputProps {
  value: number | null;
  onValueChange: (val: number | null) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  step?: string | number;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void; // Re-added
}

const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onValueChange,
  placeholder = "",
  error,
  name,
  id,
  step,
  onBlur, // Received here
}) => {
  const { formattedValue, onChange } = useFormattedNumber(value);

  // Compute numeric value by removing spaces
  const parseNumericValue = (input: string): number | null => {
    const digits = input.replace(/\s/g, "");
    return digits ? parseInt(digits, 10) : null;
  };

  // Update the value on change
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e);
    onValueChange(parseNumericValue(e.target.value));
  };

  // On blur, update the value and then call the provided onBlur for RHF
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    onValueChange(parseNumericValue(e.target.value));
    if (onBlur) onBlur(e);
  };

  return (
    <input
      type="text" // Use text to allow spaces
      name={name}
      id={id}
      value={formattedValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`shadow-md focus:ring-darkLimeGreen focus:border-darkLimeGreen border block w-full sm:text-sm rounded-lg p-3 bg-white/60 backdrop-blur-md ${
        error ? "border-red-500" : "border-gray-300"
      }`}
      placeholder={placeholder}
    />
  );
};

export default FormattedNumberInput;
