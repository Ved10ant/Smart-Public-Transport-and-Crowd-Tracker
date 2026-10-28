import React, { useEffect, useState } from 'react';
import { X, Clock, Bus, Accessibility, Navigation } from 'lucide-react';
import { Stop, Departure, fetchStopDepartures } from '../api/client.js';
import { CrowdBadge } from './CrowdBadge.js';
import { ModeBadge } from './ModeBadge.js';

interface StopDetailsDrawerProps {
  stop: Stop | null;
  onClose: () => void;
  onSelectRoute: (routeId: string) => void;
}

export const StopDetailsDrawer: React.FC<StopDetailsDrawerProps> = ({
  stop,
  onClose,
  onSelectRoute,
}) => {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stop) return;
    setLoading(true);
    fetchStopDepartures(stop.stop_id)
      .then((data) => setDepartures(data))
      .catch((err) => console.error('Failed to load departures:', err))
      .finally(() => setLoading(false));
  }, [stop]);

  if (!stop) return null;

  return (
    <div className="absolute top-4 right-4 bottom-4 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col z-30 overflow-hidden animate-in fade-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {stop.stop_id}
            </span>
            {stop.wheelchair_boarding === 1 && (
              <span className="text-[10px] flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Accessibility className="w-3 h-3" /> Accessible
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-white tracking-tight leading-snug">
            {stop.name}
          </h2>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {stop.lat.toFixed(5)}, {stop.lon.toFixed(5)}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sub-header status */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
        <span className="font-medium flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-rose-500" /> Next Departures
        </span>
        <ModeBadge mode="scheduled" />
      </div>

      {/* Departures List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading scheduled departures...</p>
          </div>
        ) : departures.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Bus className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-medium">No upcoming departures found</p>
            <p className="text-xs text-slate-500 mt-1">Check timetable service schedule.</p>
          </div>
        ) : (
          departures.map((dep) => (
            <div
              key={dep.trip_id}
              className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-sm flex items-center gap-1"
                    style={{ backgroundColor: dep.route_color || '#DC2626' }}
                  >
                    <Bus className="w-3 h-3" />
                    Route {dep.route_short_name}
                  </span>
                  <button
                    onClick={() => onSelectRoute(dep.route_id)}
                    className="text-[11px] text-slate-400 hover:text-white underline hover:no-underline flex items-center gap-0.5"
                    title="View route line on map"
                  >
                    <Navigation className="w-3 h-3" /> Trace
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-100 font-mono">
                    {dep.departure_time_str}
                  </div>
                  <div className="text-[10px] text-rose-400 font-medium">
                    in {dep.eta_minutes} mins
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-300 font-medium">
                To: <span className="text-white">{dep.headsign}</span>
              </div>

              {/* Crowd Estimate Badge with Source */}
              <div className="pt-1 border-t border-slate-700/40">
                <CrowdBadge
                  level={dep.crowd_estimate.level}
                  confidence={dep.crowd_estimate.confidence}
                  source={dep.crowd_estimate.source}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
