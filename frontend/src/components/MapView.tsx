import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Stop, RouteDetail } from '../api/client.js';
import { Bus, MapPin, Navigation } from 'lucide-react';

interface MapViewProps {
  stops: Stop[];
  selectedStop: Stop | null;
  onSelectStop: (stop: Stop) => void;
  activeRouteDetail: RouteDetail | null;
}

// Controller component to smoothly pan/zoom map on selection
function MapController({
  selectedStop,
  activeRouteDetail,
}: {
  selectedStop: Stop | null;
  activeRouteDetail: RouteDetail | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedStop) {
      map.flyTo([selectedStop.lat, selectedStop.lon], 15, { duration: 1.2 });
    }
  }, [selectedStop, map]);

  useEffect(() => {
    if (activeRouteDetail && activeRouteDetail.shape.length > 0) {
      const bounds = L.latLngBounds(activeRouteDetail.shape);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [activeRouteDetail, map]);

  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  stops,
  selectedStop,
  onSelectStop,
  activeRouteDetail,
}) => {
  // Center of Mumbai
  const center: [number, number] = [19.0760, 72.8777];

  // Custom marker icon creator
  const createStopIcon = (isSelected: boolean) =>
    L.divIcon({
      className: 'custom-stop-marker',
      html: `
        <div style="
          width: ${isSelected ? '28px' : '22px'};
          height: ${isSelected ? '28px' : '22px'};
          background-color: ${isSelected ? '#f43f5e' : '#2563eb'};
          border: 2px solid #ffffff;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          transition: transform 0.2s ease;
        ">
          <div style="width: 6px; height: 6px; background-color: #ffffff; border-radius: 9999px;"></div>
        </div>
      `,
      iconSize: [isSelected ? 28 : 22, isSelected ? 28 : 22],
      iconAnchor: [isSelected ? 14 : 11, isSelected ? 14 : 11],
    });

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
      >
        <MapController
          selectedStop={selectedStop}
          activeRouteDetail={activeRouteDetail}
        />

        {/* CartoDB Dark Matter tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Draw active route polyline if present */}
        {activeRouteDetail && activeRouteDetail.shape.length > 0 && (
          <Polyline
            positions={activeRouteDetail.shape}
            pathOptions={{
              color: activeRouteDetail.color || '#3b82f6',
              weight: 5,
              opacity: 0.85,
              dashArray: undefined,
            }}
          />
        )}

        {/* Stop Markers */}
        {stops.map((stop) => {
          const isSelected = selectedStop?.stop_id === stop.stop_id;
          return (
            <Marker
              key={stop.stop_id}
              position={[stop.lat, stop.lon]}
              icon={createStopIcon(isSelected)}
              eventHandlers={{
                click: () => onSelectStop(stop),
              }}
            >
              <Popup>
                <div className="p-1 space-y-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    {stop.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    ID: {stop.stop_id}
                  </div>
                  <button
                    onClick={() => onSelectStop(stop)}
                    className="w-full mt-2 py-1 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Bus className="w-3 h-3" /> View Departures
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
