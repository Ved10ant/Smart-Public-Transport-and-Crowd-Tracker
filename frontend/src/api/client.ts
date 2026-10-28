const API_BASE = 'http://localhost:4000/api/v1';

export interface Stop {
  stop_id: string;
  name: string;
  lat: number;
  lon: number;
  wheelchair_boarding: number;
  distance_meters?: number;
}

export interface Departure {
  trip_id: string;
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_color: string;
  headsign: string;
  departure_sec: number;
  departure_time_str: string;
  eta_minutes: number;
  mode: 'scheduled' | 'simulated' | 'live';
  crowd_estimate: {
    level: 'low' | 'medium' | 'high';
    confidence: number;
    source: string;
  };
}

export interface RouteItem {
  route_id: string;
  agency_id: string;
  short_name: string;
  long_name: string;
  route_type: number;
  color: string;
}

export interface RouteDetail extends RouteItem {
  trips_count: number;
  stops: {
    sequence: number;
    stop_id: string;
    name: string;
    lat: number;
    lon: number;
    time_str: string;
  }[];
  shape: [number, number][];
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchStops(query?: string): Promise<Stop[]> {
  const url = query ? `${API_BASE}/stops?q=${encodeURIComponent(query)}` : `${API_BASE}/stops`;
  const res = await fetch(url);
  const data = await res.json();
  return data.stops || [];
}

export async function fetchStopDepartures(stopId: string): Promise<Departure[]> {
  const res = await fetch(`${API_BASE}/stops/${encodeURIComponent(stopId)}/departures`);
  const data = await res.json();
  return data.departures || [];
}

export async function fetchRoutes(): Promise<RouteItem[]> {
  const res = await fetch(`${API_BASE}/routes`);
  const data = await res.json();
  return data.routes || [];
}

export async function fetchRouteDetails(routeId: string): Promise<RouteDetail> {
  const res = await fetch(`${API_BASE}/routes/${encodeURIComponent(routeId)}`);
  return res.json();
}
