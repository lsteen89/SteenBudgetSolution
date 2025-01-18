/**
 * ContentWrapper Component
 * 
 * This component acts as a flexible wrapper for content sections within a page.
 * It allows for both flex and grid layouts, optional content centering, and responsive
 * design adjustments based on screen size. Additionally, it supports rotating content
 * by a specified number of degrees.
 * 
 * Props:
 * - `children` (React.ReactNode): The content to be wrapped and styled.
 * - `className` (string, optional): Additional Tailwind CSS classes to customize the wrapper's styling.
 * - `centerContent` (boolean | object, optional): 
 *     - When `true`, centers the content both vertically and horizontally.
 *     - When an object, specifies centering at particular breakpoints (e.g., `{ md: true }`).
 * - `isGrid` (boolean, optional): Switches the layout to grid when `true`.
 * - `gridColumns` (1 | 2 | ... | 12, optional): Defines the number of columns in grid layout.
 * - `gap` (TailwindGap, optional): Specifies the gap size between grid items.
 * - `as` (keyof JSX.IntrinsicElements, optional): Changes the rendered HTML element (default is `section`).
 * - `rotateDegrees` (number, optional): Rotates the content by the specified degrees.
 * 
 * Usage Example:
 * ```jsx
 * <ContentWrapper isGrid gridColumns={3} gap="6" centerContent={{ lg: true }}>
 *   <GridItem />
 *   <GridItem />
 *   <GridItem />
 * </ContentWrapper>
 * ```
 * 
 * Notes:
 * - The component defaults to a maximum width of 4xl and applies horizontal padding.
 * - Rotation is handled via Tailwind's predefined classes for common angles; arbitrary angles use inline styles.
 * - Ensure `gridColumns` is between 1 and 12 to align with Tailwind's grid system.
 */

// ContentWrapper.tsx
import React from 'react';
import clsx from 'clsx';

type TailwindGap = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | '20' | '24' | '32' | '40' | '48' | '56' | '64';

interface ContentWrapperProps {
  children: React.ReactNode;
  className?: string; // Optional additional classes
  centerContent?: boolean | { sm?: boolean; md?: boolean; lg?: boolean; xl?: boolean; };
  isGrid?: boolean;    // Optional prop to switch to grid layout
  gridColumns?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12; // Tailwind supports up to 12
  gap?: TailwindGap;   // Tailwind's predefined gap sizes
  as?: keyof JSX.IntrinsicElements; // Allow rendering as different HTML elements
  rotateDegrees?: number; // Degrees to rotate the content (optional)
}

const ContentWrapper: React.FC<ContentWrapperProps> = ({
  children,
  className,
  centerContent = false, // Default to false to avoid unintended centering
  isGrid = false,
  gridColumns = 2,
  gap = '4', // Default gap size
  as: Component = 'section',
  rotateDegrees = 0, // Default rotation is 0 degrees (no rotation)
}) => {
  // Function to generate centering classes based on centerContent prop
  const getCenterClasses = () => {
    if (typeof centerContent === 'boolean') {
      return centerContent ? "flex flex-col items-center justify-center" : "";
    }
    let classes = "";
    Object.entries(centerContent).forEach(([breakpoint, value]) => {
      if (value) {
        classes += `${breakpoint}:flex ${breakpoint}:flex-col ${breakpoint}:items-center ${breakpoint}:justify-center `;
      }
    });
    return classes.trim();
  };

  // Validate gridColumns to ensure it maps to Tailwind's supported classes (1-12)
  const gridColsClass = isGrid && gridColumns >= 1 && gridColumns <= 12
    ? `grid-cols-${gridColumns}`
    : '';

  // Validate gap to match Tailwind's spacing scale or use arbitrary values cautiously
  const gapClass = isGrid ? `gap-${gap}` : '';

  // Determine rotation class (only apply if rotateDegrees matches Tailwind's predefined classes)
  const standardRotations = [0, 45, 90, 180, -45, -90, -180];
  const rotateClass = rotateDegrees !== 0 && standardRotations.includes(rotateDegrees)
    ? `rotate-${rotateDegrees}`
    : '';

  // Use inline styles for arbitrary rotation degrees not covered by Tailwind's predefined classes
  const inlineRotateStyle = rotateDegrees !== 0 && !standardRotations.includes(rotateDegrees)
    ? { transform: `rotate(${rotateDegrees}deg)` }
    : {};

  return (
    <Component
      className={clsx(
        "w-full max-w-4xl px-4 sm:px-6 lg:px-8",
        isGrid ? `grid ${gridColsClass} ${gapClass}` : "",
        !isGrid && getCenterClasses(),
        rotateClass,
        className
      )}
      style={inlineRotateStyle}
    >
      {children}
    </Component>
  );
};

export default ContentWrapper;
