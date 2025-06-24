import React, { useRef, ReactNode, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedContentProps {
  children: ReactNode;
  animationKey: string;
  className?: string;
  triggerKey: string;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({ children, animationKey, className, triggerKey }) => {
  const scrollRef = useRef<HTMLDivElement>(null);


  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [triggerKey]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={scrollRef}
        key={animationKey}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }} // A graceful duration.
        className={className}
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedContent;