import React from 'react';
import { Calendar, Cpu, Radio } from 'lucide-react';

interface ModeBadgeProps {
  mode: 'scheduled' | 'simulated' | 'live';
  className?: string;
}

export const ModeBadge: React.FC<ModeBadgeProps> = ({ mode, className = '' }) => {
  if (mode === 'live') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${className}`}>
        <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
        Live Feed
      </span>
    );
  }

  if (mode === 'simulated') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 ${className}`}>
        <Cpu className="w-3 h-3 text-amber-400" />
        Simulated
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 ${className}`}>
      <Calendar className="w-3 h-3 text-blue-400" />
      Scheduled (Timetable)
    </span>
  );
};
