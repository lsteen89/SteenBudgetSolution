// InputField.tsx
import React, { forwardRef } from 'react'; // Import forwardRef

interface TextInputProps {
  id?: string;
  name?: string; // Name from RHF's field object
  value?: string; // value from RHF's field object
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; // onChange from RHF's field object
  onBlur?: () => void; // onBlur from RHF's field object
  placeholder?: string;
  error?: string; // Error message from RHF's fieldState
  // ... any other specific props your TextInput needs
}

// Use React.ForwardedRef for the type of the ref, HTMLInputElement is the DOM element type
const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ id, name, value, onChange, onBlur, placeholder, error, ...rest }, ref) => {
    return (
      <>
        <input
          ref={ref} // <--- ASSIGN THE FORWARDED REF HERE
          type="text"
          id={id || name}
          name={name}
          value={value || ''} // Ensure value is not undefined for controlled input
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`your-styles ${error ? 'input-error-class' : ''}`} // Example styling
          {...rest}
        />
        {/* If TextInput itself displays errors based on the error prop */}
        {/* {error && <p className="text-red-500 text-sm mt-1">{error}</p>} */}
      </>
    );
  }
);

TextInput.displayName = 'TextInput'; // Good practice for components wrapped in forwardRef

export default TextInput;
