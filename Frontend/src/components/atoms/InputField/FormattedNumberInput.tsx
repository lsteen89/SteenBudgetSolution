import React, { ChangeEvent, FocusEvent, useEffect, useState } from "react";
import { useFormattedNumber } from "@hooks/useFormattedNumber";

interface FormattedNumberInputProps {
  value: number | null;
  onValueChange: (val: number | null) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  step?: string | number;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  className?: string; // ✅ Use standard React prop name
}

const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onValueChange,
  placeholder = "",
  error,
  name,
  id,
  step,
  onBlur,
  className = "", // default to empty string
}) => {
  const formatWithSpaces = (val: number | null) =>
    val?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "";

  const [formattedValue, setFormattedValue] = useState(formatWithSpaces(value));

  useEffect(() => {
    setFormattedValue(formatWithSpaces(value));
  }, [value]);

  const parseNumericValue = (input: string): number | null => {
    const digits = input.replace(/\s/g, "");
    return digits ? parseInt(digits, 10) : null;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setFormattedValue(raw);
    onValueChange(parseNumericValue(raw));
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    onValueChange(parseNumericValue(e.target.value));
    if (onBlur) onBlur(e);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9\s]*"
      name={name}
      id={id}
      value={formattedValue}
      onChange={handleChange}
      onBlur={handleBlur}
      step={step}
      placeholder={placeholder}
      className={`shadow-md focus:ring-darkLimeGreen focus:border-darkLimeGreen border block w-full sm:text-sm rounded-lg p-3 bg-white/60 backdrop-blur-md ${
        error ? "border-red-500" : "border-gray-300"
      } ${className}`} 
    />
  );
};

export default FormattedNumberInput;
