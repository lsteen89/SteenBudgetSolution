import React, { FC, ReactNode } from "react";

interface BackgroundWrapperProps {
  children: ReactNode; // Content inside the wrapper
  backgroundImage: string; // Background image URL
  className?: string; // Optional additional Tailwind classes
}

const BackgroundWrapper: FC<BackgroundWrapperProps> = ({
  children,
  backgroundImage,
  className = "",
}) => (
  <div
    className={`min-h-screen bg-no-repeat ${className}`}
    style={{ backgroundImage: `url(${backgroundImage})` }}
  >
    {children}
  </div>
);

export default BackgroundWrapper;
