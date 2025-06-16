import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedContentProps extends React.ComponentPropsWithoutRef<typeof motion.div> {
  children: React.ReactNode;
  animationKey: string | number;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  animationKey,
  children,
  initial = { opacity: 0, x: 50 },
  animate = { opacity: 1, x: 0 },
  exit = { opacity: 0, x: -50 },
  transition = { duration: 0.3 },
  ...rest
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animationKey}
        initial={initial}
        animate={animate}
        exit={exit}
        transition={transition}
        {...rest}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedContent;
