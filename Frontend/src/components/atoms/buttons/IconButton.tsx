import React from 'react';
import { Link } from 'react-router-dom';

interface IconButtonProps {
  to?: string;
  onClick?: () => void;
  ariaLabel: string;
  IconComponent?: React.FC<React.SVGProps<SVGSVGElement>>; // For React component SVGs
  iconText?: string; // For text-based icons (like "✕")
  className?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  to,
  onClick,
  ariaLabel,
  IconComponent,
  iconText,
  className = '',
}) => {
  const content = IconComponent ? (
    <IconComponent className="w-full h-full" />
  ) : (
    <span className="w-full h-full flex items-center justify-center">
      {iconText}
    </span>
  );

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick} 
        aria-label={ariaLabel}
        className={`inline-flex items-center justify-center ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center ${className}`}
    >
      {content}
    </button>
  );
};

export default IconButton;
