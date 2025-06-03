import React, { forwardRef, ComponentPropsWithoutRef, useId } from "react";
import styles from "./Checkbox.module.css";

export interface CheckboxProps
  extends Omit<ComponentPropsWithoutRef<"input">, "type" | "className"> {
  /** Main label text */
  label?: React.ReactNode;
  /** Helper/description text */
  description?: React.ReactNode;
  /** Extra classes for the outermost wrapper div */
  className?: string;
  /** Extra classes for label text span */
  labelClassName?: string;
  /** Extra classes for description text span */
  descriptionClassName?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id: propId,
      name,
      label: labelText, // Internally aliased from 'label' prop
      description,
      className = "",
      labelClassName = "",
      descriptionClassName = "",
      checked,
      onChange,
      ...rest
    },
    ref
  ) => {
    const reactGeneratedId = useId(); // React 18+ for unique IDs
    // Ensure a unique ID for the input, critical for htmlFor.
    // If not on React 18, you MUST pass a unique 'id' prop.
    const inputId = propId || name || reactGeneratedId;

    const multiLine = !!description;

    return (
      // 1. Outermost wrapper DIV.
      // This div controls the side-by-side layout of the [Checkbox Visual] and [Text Content].
      // Tailwind's `inline-flex` should arrange its children in a row.
      // `items-start` aligns the top of the checkbox with the top of the text.
      <div
        className={`
          inline-flex 
          ${multiLine ? 'items-start' : 'items-center'} 
          gap-3 
          select-none 
          ${className} {/* User-provided classes for the whole component wrapper */}
        `}
      >
        {/* 2. Clickable Checkbox Area (The Visual Part)
               This <label> wraps the hidden input and the SVG.
               It gets `styles.checkbox` for cursor and hover parent.
               It's sized to match your SVG's dimensions. */}
        <label
          htmlFor={inputId}
          className={`
            ${styles.checkbox} {/* From your CSS: cursor: pointer; */}
            relative      {/* For the absolutely positioned input inside */}
            flex-shrink-0 {/* Prevents this label from shrinking */}
            w-[25px]      {/* Matches your .checkbox_check width */}
            h-[25px]      {/* Matches your .checkbox_check height */}

          `}
        >
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            // `styles.checkbox_input` from your CSS makes this hidden and non-interactive.
            className={styles.checkbox_input}
            {...rest}
          />
          {/* The SVG is the visual representation.
              It's an immediate sibling to the input, satisfying .input:checked + .check */}
          <svg
            // `styles.checkbox_check` from your CSS styles the box and tick.
            className={styles.checkbox_check}
            width={25} // Explicit width/height also on SVG element
            height={25} // for clarity and consistency
            viewBox="0 0 25 25" // Ensure viewBox matches if your SVG paths depend on it.
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </label>

        {/* 3. Textual Content Area
               This div is a sibling to the clickable <label> above.
               Clicks here will NOT affect the checkbox state. */}
        {(labelText || description) && (
          <div className="flex flex-col flex-1 min-w-0">
            {labelText && (
              <span
                className={`text-sm font-medium text-gray-500 ${labelClassName}`}
              >
                {labelText}
              </span>
            )}
            {description && (
              <span
                className={`mt-0.5 text-xs text-gray-400 ${descriptionClassName}`}
              >
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;