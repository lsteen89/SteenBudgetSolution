// InputField.tsx
import React, { ChangeEvent, FocusEvent } from 'react';

interface InputFieldProps {
    type: string;
    name: string;
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onBlur: (event: FocusEvent<HTMLInputElement>) => void;
    error?: string;
    placeholder: string;
    className?: string;
}

const InputField: React.FC<InputFieldProps> = ({
    type,
    name,
    value,
    onChange,
    onBlur,
    error,
    placeholder,
    className,
}) => (
    <div className="input-field-container">
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            className={className}
        />
        {error && <div className="error-message">{error}</div>}
    </div>
);

export default InputField;
