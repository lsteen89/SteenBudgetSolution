import React, { ChangeEvent } from 'react';

interface SelectDropdownProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  label?: string;
  error?: string;
  onBlur?: () => void; 
}

const SelectDropdown: React.FC<SelectDropdownProps> = ({
  value,
  onChange,
  options,
  label,
  error, // Destructure the error prop here
}) => {
  return (
    <div>
      {label && (
        <label htmlFor="selectDropdown" className="block mt-4 text-sm font-medium">
          {label}
        </label>
      )}
      <select
        id="selectDropdown"
        value={value}
        onChange={onChange}
        className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 focus:ring-darkLimeGreen focus:border-darkLimeGreen sm:text-sm rounded-lg bg-white/60 backdrop-blur-md shadow-md"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default SelectDropdown;