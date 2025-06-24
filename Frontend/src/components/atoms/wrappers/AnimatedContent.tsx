import React, { useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedContentProps {
  children: ReactNode;
  animationKey: string;
  className?: string;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({ children, animationKey, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

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
        onAnimationComplete={() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedContent;