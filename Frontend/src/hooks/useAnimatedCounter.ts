import { useState, useEffect, useRef } from "react";

/**
 * A custom hook that animates a number from its previous value to a new end value.
 * It uses requestAnimationFrame for smooth, performant animations.
 * @param endValue The target number to animate to.
 * @param duration The duration of the animation in milliseconds.
 * @returns The current value of the animated number.
 */
const useAnimatedCounter = (endValue: number, duration = 500): number => {
  const [count, setCount] = useState(0);
  const animationFrameRef = useRef<number>();
  const previousValueRef = useRef(0);

  useEffect(() => {
    const startValue = previousValueRef.current;
    const targetValue = endValue ?? 0; // Gracefully handle null/undefined
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      const currentValue = startValue + (targetValue - startValue) * progress;
      setCount(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure it ends precisely on the target value
        setCount(targetValue);
        previousValueRef.current = targetValue;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Set the "previous" value to the latest state value on cleanup
      // This ensures the next animation starts from the right place
      previousValueRef.current = targetValue; 
    };
  }, [endValue, duration]);

  return Math.ceil(count);
};

export default useAnimatedCounter;