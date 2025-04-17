import React, { ChangeEvent, FocusEvent } from "react";
import { ChevronDown } from "lucide-react"; 

interface NumberDropdownProps {
  value: number | null;
  onValueChange: (val: number | null) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  step?: string | number; // Although not used in a select element, kept for consistency
  onBlur?: (e: FocusEvent<HTMLSelectElement>) => void;
  className?: string;
  end: number; // Dropdown will show numbers from 0 to `end`
}

const NumberDropdown: React.FC<NumberDropdownProps> = ({
  value,
  onValueChange,
  placeholder = "",
  error,
  name,
  id,
  step,
  onBlur,
  className = "",
  end,
}) => {
  // If no value is provided, default to the placeholder option ("") so the placeholder shows.
  // Otherwise, use the provided number.
  const selectedValue = value === null ? "" : value;

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    // Convert the value to a number or default to 0 if empty.
    onValueChange(val === "" ? 0 : Number(val));
  };

  return (
    <div className="relative w-full">
      <select
        name={name}
        id={id}
        value={selectedValue}
        onChange={handleChange}
        onBlur={onBlur}
        className={`appearance-none overflow-y-auto max-h-[12rem] pr-10
          shadow-inner border transition-all duration-200 ease-in-out
          focus:ring-2 focus:ring-darkLimeGreen focus:border-darkLimeGreen
          border-gray-300 text-gray-800 bg-white/60 backdrop-blur-md
          hover:border-darkLimeGreen hover:bg-white
          disabled:opacity-50 disabled:cursor-not-allowed
          block w-full sm:text-sm rounded-xl p-3 font-medium
          ${error ? "border-red-500 ring-red-400 focus:ring-red-400" : ""}
          ${className}`}
        aria-label="Select a number"
        size={1} // keeps it acting like a dropdown
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {Array.from({ length: end + 1 }, (_, i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
        <ChevronDown />
      </div>
    </div>
  );
};

export default NumberDropdown;
