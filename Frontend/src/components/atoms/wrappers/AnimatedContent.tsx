import React, { useRef, ReactNode, useEffect } from 'react'; // We must use useEffect for this patient spell
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedContentProps {
  children: ReactNode;
  animationKey: string;
  className?: string;
  triggerKey: string;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({ children, animationKey, className, triggerKey }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Here is the final, wisened spell.
  useEffect(() => {
    // By placing our scroll command within a setTimeout, we allow the browser
    // to finish all its pressing work first (like calculating the new page height).
    // Our command is then placed at the end of the queue, ensuring it is the final word.
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        // The container is now ready and will obey the command to scroll.
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 0); // A timeout of 0 is sufficient to yield to the browser's timing.

    // We clean up our spell, as is proper.
    return () => clearTimeout(timer);
  }, [triggerKey]); // The spell is still keyed to our all-powerful trigger.

  return (
    <AnimatePresence>
      <motion.div
        ref={scrollRef}
        key={animationKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className={className}
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedContent;