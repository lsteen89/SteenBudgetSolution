// hooks/useBreakpoint.ts
import { useState, useEffect } from 'react';
import debounce from 'lodash.debounce'; // Ensure lodash.debounce is installed

export type Breakpoint = 'lg' | 'xl' | '2xl' | '3xl';

const useBreakpoint = (): Breakpoint => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');

  useEffect(() => {
    // If window is undefined (e.g., during SSR), exit early
    if (typeof window === 'undefined') return;

    const determineBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= 1921) {
        setBreakpoint('3xl');
      } else if (width >= 1536) {
        setBreakpoint('2xl');
      } else if (width >= 1280) {
        setBreakpoint('xl');
      } else if (width >= 1024) {
        setBreakpoint('lg');
      }
    };

    // Debounced version to optimize performance
    const debouncedDetermineBreakpoint = debounce(determineBreakpoint, 150);

    // Initial check
    determineBreakpoint();

    // Add event listener
    window.addEventListener('resize', debouncedDetermineBreakpoint);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', debouncedDetermineBreakpoint);
      debouncedDetermineBreakpoint.cancel();
    };
  }, []);

  return breakpoint;
};

export default useBreakpoint;
