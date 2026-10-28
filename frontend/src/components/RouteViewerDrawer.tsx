import React, { useEffect, useState } from 'react';
import { RouteItem, RouteDetail, fetchRoutes, fetchRouteDetails, Stop } from '../api/client.js';
import { Route as RouteIcon, Bus, ChevronRight, X, MapPin } from 'lucide-react';

interface RouteViewerDrawerProps {
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string | null) => void;
  onSelectStop: (stop: Stop) => void;
  onClose: () => void;
}

export const RouteViewerDrawer: React.FC<RouteViewerDrawerProps> = ({
  selectedRouteId,
  onSelectRoute,
  onSelectStop,
  onClose,
}) => {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [routeDetail, setRouteDetail] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoutes()
      .then((data) => setRoutes(data))
      .catch((err) => console.error('Failed to load routes:', err));
  }, []);

  useEffect(() => {
    if (!selectedRouteId) {
      setRouteDetail(null);
      return;
    }
    setLoading(true);
    fetchRouteDetails(selectedRouteId)
      .then((detail) => setRouteDetail(detail))
      .catch((err) => console.error('Failed to load route detail:', err))
      .finally(() => setLoading(false));
  }, [selectedRouteId]);

  return (
    <div className="absolute top-4 left-4 bottom-4 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col z-30 overflow-hidden animate-in fade-in slide-in-from-left duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center">
            <RouteIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Mumbai Bus Routes</h2>
            <p className="text-[11px] text-slate-400">BEST Lines & Corridors</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Route List / Details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {routeDetail ? (
          <div className="space-y-4">
            {/* Back to all routes */}
            <button
              onClick={() => onSelectRoute(null)}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
            >
              ← Back to all routes
            </button>

            {/* Route summary card */}
            <div
              className="p-4 rounded-xl border border-slate-700/80 bg-slate-800/40 space-y-2"
              style={{ borderLeftColor: routeDetail.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-1 rounded text-xs font-bold text-white shadow"
                  style={{ backgroundColor: routeDetail.color }}
                >
                  Bus {routeDetail.short_name}
                </span>
                <span className="text-xs text-slate-400">
                  {routeDetail.trips_count} trips today
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100">{routeDetail.long_name}</h3>
              <p className="text-xs text-slate-400">
                {routeDetail.stops.length} sequential stops in route shape.
              </p>
            </div>

            {/* Stops Sequence */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Stop Sequence & Timetable
              </h4>
              <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                {routeDetail.stops.map((st, idx) => (
                  <button
                    key={`${st.stop_id}-${idx}`}
                    onClick={() =>
                      onSelectStop({
                        stop_id: st.stop_id,
                        name: st.name,
                        lat: st.lat,
                        lon: st.lon,
                        wheelchair_boarding: 1,
                      })
                    }
                    className="w-full text-left relative flex items-start justify-between group p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                  >
                    <div
                      className="absolute -left-[19px] top-3 w-3 h-3 rounded-full border-2 border-slate-900 group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: routeDetail.color }}
                    />
                    <div>
                      <div className="text-xs font-medium text-slate-200 group-hover:text-white">
                        {st.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Sequence #{st.sequence}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {st.time_str}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {routes.map((r) => (
              <button
                key={r.route_id}
                onClick={() => onSelectRoute(r.route_id)}
                className="w-full p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/70 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-md"
                    style={{ backgroundColor: r.color || '#DC2626' }}
                  >
                    {r.short_name}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-white">
                      Route {r.short_name}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">
                      {r.long_name}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
