
import React from 'react';
import clsx from 'clsx'; 

interface ContentWrapperProps {
  children: React.ReactNode;
  className?: string; // Optional className prop
}

const ContentWrapper: React.FC<ContentWrapperProps> = ({ children, className }) => {
    return (
      <div
        className={clsx(
            "flex flex-col items-center justify-center w-full max-w-4xl px-5", // Centered, responsive width
          className // Merges additional classes if provided
        )}
        >
        {children}
      </div>
    );
  };

export default ContentWrapper;

  


