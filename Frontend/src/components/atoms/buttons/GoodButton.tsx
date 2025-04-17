import React, { MouseEventHandler } from 'react';

interface GoodButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean; // Flag for active/green styling
}

const GoodButton: React.FC<GoodButtonProps> = ({
  onClick,
  children,
  disabled = false,
  active = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mt-2 font-bold py-3 px-6 rounded-xl shadow-md transform transition-all
        ${active && !disabled
          ? "bg-darkLimeGreen hover:bg-limeGreen hover:scale-105 text-white"
          : "bg-gray-400 text-white cursor-not-allowed opacity-70"
        }`}
    >
      {children}
    </button>
  );
};

export default GoodButton;

// This component is a button styled with Tailwind CSS classes. It accepts an onClick handler and children to display inside the button. The button has hover effects and a scaling animation for better user interaction.
// The button is designed to be used in various parts of the application, providing a consistent look and feel.
// It can be disabled based on the `disabled` prop, and it can also have an active state for visual feedback when the button is clickable.
// The `active` prop determines if the button should have a green background and scaling effect on hover.