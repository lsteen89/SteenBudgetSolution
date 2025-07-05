/**
 * SubmitButton Component
 *
 * A reusable button component with flexible styling, loading state, and optional enhanced hover effects.
 *
 * Props:
 * - `isSubmitting` (boolean, required):
 *   - Controls the loading state of the button.
 *   - Displays a spinner and disables interaction when true.
 *
 * - `label` (string, optional):
 *   - The text displayed on the button.
 *   - Defaults to "Submit" if not provided.
 *
 * - `onClick` (function, optional):
 *   - Callback function invoked when the button is clicked.
 *
 * - `style` (React.CSSProperties, optional):
 *   - Inline styles for custom button styling.
 *
 * - `type` ('button' | 'submit' | 'reset', optional):
 *   - Specifies the button type attribute.
 *   - Defaults to 'button'.
 *
 * - `size` ('small' | 'default' | 'large', optional):
 *   - Controls the size of the button.
 *   - Default size is 'default'.
 *   - Options:
 *     - `small`: Smaller font and padding.
 *     - `default`: Standard font and padding.
 *     - `large`: Larger font and padding.
 *
 * - `enhanceOnHover` (boolean, optional):
 *   - If true, enables enhanced hover effects:
 *     - Button scales up slightly (`hover:scale-110`).
 *     - Background color changes to `#001F3F`.
 *     - Text color changes to white.
 *   - Default is false (standard hover behavior).
 *
 * Behaviors:
 * - **Hover Effects**:
 *   - Standard: Changes background color to a lighter green (`#85e085`).
 *   - Enhanced (if `enhanceOnHover` is true): Scales and changes background to `#001F3F` with white text.
 *
 * - **Loading State**:
 *   - Displays a spinning loader when `isSubmitting` is true.
 *   - Disables interaction with the button.
 *
 * - **Sizing**:
 *   - Adjusts font size and padding dynamically based on the `size` prop.
 *
 * Example Usage:
 * ```
 * <SubmitButton
 *   isSubmitting={false}
 *   label="Submit"
 *   size="large"
 *   enhanceOnHover
 *   onClick={() => alert('Clicked!')}
 * />
 * ```
 */

import React from 'react';
import clsx from "clsx";

  interface SubmitButtonProps {
    isSubmitting: boolean;
    label?: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; 
    style?: React.CSSProperties;
    type?: 'button' | 'submit' | 'reset';
    size?: 'small' | 'large' | 'default';
    enhanceOnHover?: boolean; // Optional flag for enhanced hover behavior
    icon?: React.ReactNode; // Optional icon prop
    className?: string; // optional className prop
  }

  const sizeClasses = {
    small: 'text-[16px] py-2 px-4',
    default: 'text-[20px] py-3 px-6',
    large: 'text-[32px] py-4 px-8',
  };



  const SubmitButton: React.FC<SubmitButtonProps> = ({
    isSubmitting,
    label = 'Submit',
    onClick, // We will use this directly
    style,
    type = 'button',
    size = 'default',
    enhanceOnHover = false,
    icon,
    className = '',
  }) => {
  return (
    <button
      type={type}
      disabled={isSubmitting}
      onClick={onClick}
      style={style}
      className={clsx(
        "inline-flex items-center justify-center font-bold rounded-[20px] shadow-md",
        "transition-all ease-out duration-300 border-none whitespace-nowrap",
        sizeClasses[size],

        /* base colours (only applied when caller hasn’t overridden them) */
        !isSubmitting && "bg-lime-500 text-slate-900",

        /* disabled */
        isSubmitting && "bg-gray-300 text-gray-600 cursor-not-allowed",

        /* hover variants (when not submitting) */
        !isSubmitting &&
          (enhanceOnHover
            ? "hover:bg-[#001F3F] hover:text-white hover:scale-110"
            : "hover:bg-lime-400"),


        className,
      )}
    >
      {isSubmitting ? (
        <div
          className="w-[20px] h-[20px] border-4 border-[#f3f3f3] border-t-[#333] 
          rounded-full animate-spin ml-2"
          aria-label="Loading spinner"
        ></div>
      ) : (
        <>
          {icon && (
            <span
              className={`mr-2 transition-colors duration-300 ${
                enhanceOnHover ? 'hover:text-white' : ''
              }`}
            >
              {icon}
            </span>
          )}
          <span
            className={`transition-colors duration-300 ${
              enhanceOnHover ? 'hover:text-white' : ''
            }`}
          >
            {label}
          </span>
        </>
      )}
    </button>
  );
};

export default SubmitButton;

