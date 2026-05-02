import React, { useMemo } from 'react';
import { Severity } from '../types';
import { cn } from '../lib/utils';

interface BadgeProps {
  severity: Severity | string;
  className?: string;
}

export const SeverityBadge: React.FC<BadgeProps> = ({ severity, className }) => {
  const styles = useMemo(() => {
    switch (severity.toUpperCase()) {
      case Severity.CRITICAL:
        return 'bg-red-950 text-red-400 border-red-800';
      case Severity.HIGH:
        return 'bg-orange-950 text-orange-400 border-orange-800';
      case Severity.MEDIUM:
        return 'bg-yellow-950 text-yellow-400 border-yellow-800';
      case Severity.LOW:
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  }, [severity]);

  return (
    <span id={`badge-${severity.toLowerCase()}`} className={cn(
      'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider',
      styles,
      className
    )}>
      {severity}
    </span>
  );
};
