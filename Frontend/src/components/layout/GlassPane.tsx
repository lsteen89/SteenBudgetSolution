import { cn } from '@/lib/utils';
import React, { ReactNode } from 'react';

interface GlassPaneProps {
  children: ReactNode;
  withBackground?: boolean; // Optional bool to control background color
  className?: string; // Optional className for additional styling
}

const GlassPane: React.FC<GlassPaneProps> = ({
  children,
  withBackground = false,
  className = "",
}) => {
  const bgClass = withBackground
    ? "bg-slate-50/50 border border-slate-200/60 shadow-sm"
    : "";

  return (
    <div className={cn("text-center p-6 rounded-2xl text-slate-900", bgClass, className)}>
      {children}
    </div>
  );
};

export default GlassPane;
