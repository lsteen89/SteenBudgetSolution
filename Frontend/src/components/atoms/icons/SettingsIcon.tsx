import React from 'react';

const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className = '', ...props }) => (
  <svg
    className={`w-6 h-6 ${className}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19.5 12a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
    />
  </svg>
);

export default SettingsIcon;
