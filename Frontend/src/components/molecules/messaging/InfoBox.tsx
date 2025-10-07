import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

interface InfoBoxProps {
  children: React.ReactNode;
  className?: string;
  icon?: boolean;
  align?: 'start' | 'center';
}

const InfoBox: React.FC<InfoBoxProps> = ({
  children,
  className,
  icon = true,
  align,
}) => {
  // default: with icon => start, without icon => center
  const resolvedAlign: 'start' | 'center' = align ?? (icon ? 'start' : 'center');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={`rounded-xl bg-slate-800/50 p-4 text-sm text-white/90 ring-1 ring-inset ring-white/10 ${className || ''}`}
    >
      <div
        className={`flex w-full flex-col sm:flex-row gap-3 sm:gap-2 ${resolvedAlign === 'center' ? 'items-center' : 'items-start'
          }`}
      >
        {icon && <Info size={18} className="mt-0.5 shrink-0 text-darkLimeGreen" />}

        {/* Make content span available width so text-center actually works */}
        <div className={`flex-1 w-full ${resolvedAlign === 'center' ? 'text-center' : ''}`}>
          {children}
        </div>
      </div>
    </motion.div>
  );
};

export default InfoBox;
