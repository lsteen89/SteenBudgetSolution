// hooks/useSubtleFireworks.ts
import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export const useSubtleFireworks = () => {
  const fire = useCallback(() => {
    console.log('[useSubtleFireworks] fire() called');

    confetti({
      particleCount: 80,
      spread: 45,
      startVelocity: 25,
      origin: { y: 0.3 },
      scalar: 0.8,
      zIndex: 2147483647,
      disableForReducedMotion: true,
    });
  }, []);

  return { fire };
};
