import React, { InputHTMLAttributes } from 'react';

// Define the props for the component. It extends all standard input attributes
// but requires 'id' and 'label' for the component to function correctly.
interface CheckboxOptionProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

/**
 * A styled checkbox component with a label.
 * It's designed as a self-contained unit with a surrounding label,
 * making the entire area clickable.
 */
const CheckboxOption: React.FC<CheckboxOptionProps> = ({ id, label, ...props }) => {
  return (
    <label
      htmlFor={id}
      className="flex items-center space-x-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
    >
      <input
        id={id}
        type="checkbox"
        className="h-5 w-5 rounded border-gray-300 text-lime-500 focus:ring-lime-400 bg-transparent"
        {...props} // Spreads other props like 'checked', 'onChange', 'value', etc.
      />
      <span className="text-white font-medium">{label}</span>
    </label>
  );
};

export default CheckboxOption;