import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar.js';
import { MapView } from './components/MapView.js';
import { StopSearch } from './components/StopSearch.js';
import { StopDetailsDrawer } from './components/StopDetailsDrawer.js';
import { RouteViewerDrawer } from './components/RouteViewerDrawer.js';
import { Stop, RouteItem, RouteDetail, fetchStops, fetchRoutes, fetchRouteDetails } from './api/client.js';
import { Info, Sparkles, Navigation, Layers } from 'lucide-react';

export function App() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [activeRouteDetail, setActiveRouteDetail] = useState<RouteDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'routes'>('map');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    // Initial fetch of stops & routes
    fetchStops()
      .then((data) => setStops(data))
      .catch((err) => console.error('Failed to load stops:', err));

    fetchRoutes()
      .then((data) => setRoutes(data))
      .catch((err) => console.error('Failed to load routes:', err));
  }, []);

  // When a route ID changes, fetch route detail with shapes and stop sequence
  useEffect(() => {
    if (!selectedRouteId) {
      setActiveRouteDetail(null);
      return;
    }
    fetchRouteDetails(selectedRouteId)
      .then((detail) => setActiveRouteDetail(detail))
      .catch((err) => console.error('Failed to fetch route detail:', err));
  }, [selectedRouteId]);

  const handleSelectStop = (stop: Stop) => {
    setSelectedStop(stop);
    setIsDrawerOpen(true);
  };

  const handleSelectRouteFromDrawer = (routeId: string) => {
    setSelectedRouteId(routeId);
    setActiveTab('routes');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalStops={stops.length}
        totalRoutes={routes.length}
      />

      {/* Main Interactive Workspace */}
      <div className="relative flex-1 w-full h-[calc(100vh-4rem)] overflow-hidden">
        {/* Leaflet Map Canvas */}
        <MapView
          stops={stops}
          selectedStop={selectedStop}
          onSelectStop={handleSelectStop}
          activeRouteDetail={activeRouteDetail}
        />

        {/* Floating Controls Overlay on top of Map */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          {/* Stop Search Bar */}
          <StopSearch onSelectStop={handleSelectStop} selectedStopId={selectedStop?.stop_id} />

          {/* Quick Pill Filter for Popular Transit Hubs */}
          <div className="flex items-center gap-1.5 flex-wrap max-w-md">
            {stops.slice(0, 4).map((s) => (
              <button
                key={s.stop_id}
                onClick={() => handleSelectStop(s)}
                className="text-[11px] font-medium bg-slate-900/80 hover:bg-rose-600/90 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700/60 shadow-lg backdrop-blur-md transition-all flex items-center gap-1"
              >
                <span>{s.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Route Floating Indicator */}
        {activeRouteDetail && (
          <div className="absolute bottom-6 left-4 z-20 bg-slate-900/90 border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: activeRouteDetail.color }}
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Active Route: Bus {activeRouteDetail.short_name}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {activeRouteDetail.stops.length} stops • Shape polyline traced
              </div>
            </div>
            <button
              onClick={() => setSelectedRouteId(null)}
              className="text-[10px] text-slate-400 hover:text-rose-400 font-semibold ml-2 underline"
            >
              Clear Route
            </button>
          </div>
        )}

        {/* Floating Bottom Disclaimer Banner (Ground Rule #3 & Section 11 of Spec) */}
        <div className="absolute bottom-6 right-4 z-20 hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-full text-[11px] text-slate-400 shadow-xl backdrop-blur-md">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Scheduled Timetable Mode Active • Crowd levels are rule-based estimates</span>
        </div>

        {/* Stop Details Slide-in Drawer */}
        {isDrawerOpen && selectedStop && (
          <StopDetailsDrawer
            stop={selectedStop}
            onClose={() => setIsDrawerOpen(false)}
            onSelectRoute={handleSelectRouteFromDrawer}
          />
        )}

        {/* Routes Explorer Drawer */}
        {activeTab === 'routes' && (
          <RouteViewerDrawer
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            onSelectStop={handleSelectStop}
            onClose={() => setActiveTab('map')}
          />
        )}
      </div>
    </div>
  );
}

export default App;
