import React, { ChangeEvent, FocusEvent, forwardRef, SelectHTMLAttributes } from 'react'; 


interface SelectDropdownProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: Array<{ value: string; label: string; disabled?: boolean; hidden?: boolean }>;
  value: string; 
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void; 
  label?: string;
  error?: string;

}

const SelectDropdown = forwardRef<HTMLSelectElement, SelectDropdownProps>(
  (
    {
      value,
      onChange,
      onBlur, 
      options,
      label,
      error,
      disabled,
      className, // Allow passing additional class names
      id,      
      name,    
      ...rest   
    },
    ref 
  ) => {
    const baseClasses = "mt-1 text-black block w-full pl-3 pr-10 py-2 border-gray-300 focus:ring-darkLimeGreen focus:border-darkLimeGreen sm:text-sm rounded-lg bg-white/60 backdrop-blur-md shadow-md";
    const errorClasses = error ? "border-red-500" : "border-gray-300"; 
    const combinedClassName = `${baseClasses} ${errorClasses} ${className || ''}`.trim();

    return (
      <div>
        {label && (
          <label
            htmlFor={id || name} 
            className="block mt-4 text-sm font-medium text-gray-700 dark:text-gray-200" 
          >
            {label}
          </label>
        )}
        <select
          id={id || name} 
          name={name}    
          ref={ref}     
          value={value}
          onChange={onChange}
          onBlur={onBlur}   
          disabled={disabled}
          className={combinedClassName}
          {...rest}
        >

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              hidden={option.hidden} // Note: 'hidden' on <option> has limited browser support
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>} {/* Adjusted error text size */}
      </div>
    );
  }
);

SelectDropdown.displayName = 'SelectDropdown'; 

export default SelectDropdown;