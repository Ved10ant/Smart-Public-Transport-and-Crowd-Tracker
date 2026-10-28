import React from 'react';
import { Users, Info } from 'lucide-react';

interface CrowdBadgeProps {
  level: 'low' | 'medium' | 'high';
  confidence?: number;
  source?: string;
  showDetails?: boolean;
}

export const CrowdBadge: React.FC<CrowdBadgeProps> = ({
  level,
  confidence = 0.8,
  source = 'Historical peak-hour rule, estimated',
  showDetails = true,
}) => {
  const config = {
    low: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      label: 'Low Crowding',
    },
    medium: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      label: 'Moderate Crowding',
    },
    high: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      label: 'High Crowding',
    },
  }[level];

  return (
    <div className="flex flex-col gap-0.5">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.bg} ${config.border} ${config.text} w-fit`}>
        <Users className="w-3.5 h-3.5" />
        <span>{config.label}</span>
        <span className="text-[10px] opacity-75">({Math.round(confidence * 100)}% conf)</span>
      </div>
      {showDetails && (
        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5" title={source}>
          <Info className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="truncate max-w-[200px]">{source}</span>
        </span>
      )}
    </div>
  );
};
