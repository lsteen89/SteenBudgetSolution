import { useEffect } from 'react';

/**
 * A custom hook to enable or disable scrolling on the page.
 * 
 * @param disable - A boolean flag to determine whether scrolling should be disabled.
 */
const useDisableScroll = (disable: boolean): void => {
  useEffect(() => {
    if (disable) {
      // Disable scrolling
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    // Cleanup to ensure scrolling is re-enabled when the component unmounts
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [disable]); // Runs when `disable` changes
};

export default useDisableScroll;
