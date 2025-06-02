import React, {
  ChangeEvent,
  FocusEvent,
  useEffect,
  useState,
  forwardRef, // Import forwardRef
} from "react";
// Removed: import { useFormattedNumber } from "@hooks/useFormattedNumber"; // As the formatting logic is now local

interface FormattedNumberInputProps {
  value: number | null; // The actual numeric value for RHF
  onValueChange: (val: number | null) => void; // Callback with the parsed numeric value
  placeholder?: string;
  error?: string; // Error message from RHF
  name?: string; // Name from RHF's field object
  id?: string;
  step?: string | number; // For number input, though using type="text" now
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void; // RHF's onBlur
  className?: string;
  // You might also want to accept other standard input props via ...rest
}

// Use React.ForwardedRef for the type of the ref, HTMLInputElement is the DOM element type
const FormattedNumberInput = forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  (
    {
      value, // This is the actual numeric value from RHF
      onValueChange,
      placeholder = "",
      error,
      name,
      id,
      step, // Note: step attribute has limited effect on type="text"
      onBlur, // This will be RHF's onBlur
      className = "",
      ...rest // Capture any other native input props
    },
    ref // The forwarded ref from RHF (via Controller)
  ) => {
    const formatWithSpaces = (val: number | null): string =>
      val?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "";

    // Local state for the displayed (formatted) string value
    const [displayValue, setDisplayValue] = useState<string>(formatWithSpaces(value));

    // Sync displayValue when the external 'value' (from RHF) changes
    useEffect(() => {
      setDisplayValue(formatWithSpaces(value));
    }, [value]);

    const parseNumericValue = (input: string): number | null => {
      const digits = input.replace(/\s/g, ""); // Remove all spaces
      if (digits === "") return null;
      const num = parseInt(digits, 10);
      return isNaN(num) ? null : num; // Return null if parsing fails
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const rawInputValue = e.target.value;
      // Allow only numbers and spaces for input
      const numericString = rawInputValue.replace(/[^\d\s]/g, "");
      const parsed = parseNumericValue(numericString); // Parse to get the number for RHF
      
      // Update the local display with potentially partially formatted input
      // Or reformat completely:
      const formattedForDisplay = formatWithSpaces(parsed); // Reformat to maintain consistency or allow flexible typing
      
      // If you want immediate re-formatting as user types:
      // setDisplayValue(formattedForDisplay); 
      // If you want to allow user to type spaces freely and only format on blur/value change:
      setDisplayValue(numericString); // Allows user to type spaces, etc.

      onValueChange(parsed); // Notify RHF with the actual numeric value (or null)
    };

    const handleBlurEvent = (e: FocusEvent<HTMLInputElement>) => {
      // Re-format the display value on blur to ensure consistent formatting
      const currentValue = parseNumericValue(e.target.value);
      setDisplayValue(formatWithSpaces(currentValue));

      // Call RHF's onBlur if provided
      if (onBlur) {
        onBlur(e);
      }
      // Note: onValueChange was already called in handleChange.
      // If you only want to call onValueChange on blur, move it here from handleChange
      // and ensure `e.target.value` is used for parsing.
    };

    return (
      <input
        ref={ref} // Apply the forwarded ref to the input element
        type="text" // Use type="text" to allow spaces for formatting
        inputMode="numeric" // Provides numeric keyboard on mobile
        pattern="[0-9\s]*" // Allows numbers and spaces (for visual formatting)
        name={name}
        id={id || name} // Use name for id if id is not provided
        value={displayValue} // Display the formatted string
        onChange={handleChange}
        onBlur={handleBlurEvent} // Use the new blur handler
        step={step} // Less effective with type="text"
        placeholder={placeholder}
        className={`shadow-md focus:ring-darkLimeGreen focus:border-darkLimeGreen border block w-full sm:text-sm rounded-lg p-3 bg-white/60 backdrop-blur-md ${
          error ? "border-red-500" : "border-gray-300"
        } ${className}`}
        {...rest} // Spread any other passed-in props (like aria-invalid for RHF)
      />
      // Optionally display the error message here if the component should be self-contained
      // {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    );
  }
);

FormattedNumberInput.displayName = "FormattedNumberInput"; // Good practice for forwardRef components

export default FormattedNumberInput;