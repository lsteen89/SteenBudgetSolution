import { useState, useEffect } from "react";

function formatWithSpaces(num: number): string {
  if (num === null || isNaN(num)) {
    return "";
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function useFormattedNumber(initialValue: number | null = 0) {
  // Store raw input as a string
  const [rawInput, setRawInput] = useState<string>(
    initialValue !== null ? initialValue.toString() : ""
  );
  const [formattedValue, setFormattedValue] = useState<string>(
    initialValue !== null ? formatWithSpaces(initialValue) : ""
  );

  useEffect(() => {
    // Update formatted value when raw input changes
    const digitsOnly = rawInput.replace(/\D/g, "");
    if (digitsOnly === "") {
      setFormattedValue("");
    } else {
      const num = parseInt(digitsOnly, 10);
      setFormattedValue(formatWithSpaces(num));
    }
  }, [rawInput]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Allow only digits and spaces
    if (/^[\d\s]*$/.test(input)) {
      setRawInput(input);
    }
    // If invalid, do nothing (ignore letters)
  };

  // Derive numeric value from raw input if possible
  const numericValue =
    rawInput.replace(/\D/g, "") !== "" ? parseInt(rawInput.replace(/\D/g, ""), 10) : null;

  return {
    rawValue: numericValue,       // For form state (numeric)
    formattedValue,               // For display (string with spaces)
    onChange: handleChange,       // Use this in the input's onChange
    setRawInput,                  // Optionally, expose a setter if needed
  };
}
