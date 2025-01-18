/**
 * PageContainer Component
 * 
 * This component serves as the primary layout wrapper for each page in the application.
 * It manages the overall page structure, including vertical and horizontal centering
 * of its child elements, and applies consistent padding across different screen sizes.
 * 
 * Props:
 * - `children` (React.ReactNode): The content to be rendered within the container.
 * - `noPadding` (boolean, optional): When set to `true`, removes the default vertical padding.
 * - `className` (string, optional): Additional Tailwind CSS classes to customize the container's styling.
 * - `centerChildren` (boolean, optional): Centers all child elements both vertically and horizontally when `true`.
 * 
 * Usage Example:
 * ```jsx
 * <PageContainer centerChildren={true}>
 *   <YourContent />
 * </PageContainer>
 * ```
 * 
 * Notes:
 * - The `relative` class is applied to enable absolute positioning of child elements relative to this container.
 * - Ideal for pages that require consistent padding and optional global centering of content.
 */

// PageContainer.tsx
import React from 'react';
import clsx from 'clsx';

interface PageContainerProps {
  children: React.ReactNode;
  noPadding?: boolean; // Optional prop to disable padding
  className?: string;   // Allow custom classes
  centerChildren?: boolean; // Optional prop to center children
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  noPadding = false,
  className = "",
  centerChildren = false,
}) => {
  const paddingClass = noPadding ? "py-0" : "py-10 sm:py-20";
  const centerClass = centerChildren ? "flex flex-col justify-center items-center" : "flex flex-col";

  return (
    <main
      className={clsx(
        "page-container min-h-screen",
        centerClass,
        paddingClass,
        className
      )}
      role="main"
    >
      {children}
    </main>
  );
};

export default PageContainer;
