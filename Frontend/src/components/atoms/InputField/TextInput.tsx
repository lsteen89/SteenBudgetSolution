import React, { ChangeEvent, FocusEvent, forwardRef, InputHTMLAttributes } from "react";

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "onBlur" | "value"> {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  touched?: boolean;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;

  className?: string;        // wrapper / input (legacy)
  inputClassName?: string;   // NEW: actual input styling override
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "",
      error,
      touched,
      name,
      id,
      onBlur,
      className = "",
      inputClassName = "",
      ...rest
    },
    ref
  ) => {
    const baseClasses =
      "shadow-md focus:ring-darkLimeGreen focus:border-darkLimeGreen block w-full sm:text-sm rounded-lg p-3 bg-white/60 border backdrop-blur-md";
    const errorClasses = error && touched ? "border-red-500" : "border-gray-300";

    return (
      <input
        ref={ref}
        type="text"
        name={name}
        id={id || name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`${baseClasses} ${errorClasses} ${className} ${inputClassName}`}
        placeholder={placeholder}
        {...rest}
      />
    );
  }
);

TextInput.displayName = "TextInput";
export default TextInput;
