import { useEffect } from 'react';

const useDisableScroll = (disable: boolean) => {
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
