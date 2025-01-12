import React from 'react';
import clsx from 'clsx'; 

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ children, className }) => {
    return (
        <div
          className={clsx(
            "page-container min-h-screen flex flex-col justify-center items-center py-10 sm:py-20", // Center content vertically
            className // Merges additional classes if provided
          )}
        >
          {children}
        </div>
      );
    };

export default PageContainer;
