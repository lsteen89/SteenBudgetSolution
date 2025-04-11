import React, { ChangeEvent, FocusEvent } from "react";

interface SelectDropdownProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  // Adjust onBlur to match a real select's focus event
  onBlur?: (e: FocusEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string; disabled?: boolean; hidden?: boolean }[];
  label?: string;
  error?: string;
  // Provide a ref prop for React Hook Form
  selectRef?: React.Ref<HTMLSelectElement>;
  disabled?: boolean;
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  onChange,
  onBlur,
  options,
  label,
  error,
  selectRef,
  disabled,
}) => {
  return (
    <div>
      {label && (
        <label
          htmlFor="selectDropdown"
          className="block mt-4 text-sm font-medium"
        >
          {label}
        </label>
      )}
      <select
        id="selectDropdown"
        ref={selectRef}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        className="mt-1 text-black block w-full pl-3 pr-10 py-2 border-gray-300 focus:ring-darkLimeGreen focus:border-darkLimeGreen sm:text-sm rounded-lg bg-white/60 backdrop-blur-md shadow-md"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            hidden={option.hidden}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-lg mt-1">{error}</p>}
    </div>
  );
};

export default SelectDropdown;
