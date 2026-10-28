import React from 'react';
import { Bus, MapPin, Route, ShieldCheck } from 'lucide-react';
import { ModeBadge } from './ModeBadge.js';

interface NavbarProps {
  activeTab: 'map' | 'routes';
  setActiveTab: (tab: 'map' | 'routes') => void;
  totalStops: number;
  totalRoutes: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalStops,
  totalRoutes,
}) => {
  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 flex items-center justify-between z-30 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50">
          <Bus className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight">Mumbai Transit Tracker</h1>
            <span className="hidden sm:inline-block text-[11px] font-semibold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
              BEST Network
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Timetable-aware routing & crowd estimates for MMR
          </p>
        </div>
      </div>

      {/* Center Tabs */}
      <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'map'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Stops ({totalStops})</span>
        </button>
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'routes'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Route className="w-3.5 h-3.5" />
          <span>Routes ({totalRoutes})</span>
        </button>
      </div>

      {/* Right Mode Badge & Status */}
      <div className="flex items-center gap-3">
        <ModeBadge mode="scheduled" />
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/50">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>GTFS Verified</span>
        </div>
      </div>
    </header>
  );
};
