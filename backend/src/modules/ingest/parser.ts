import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { timeStringToSeconds } from '../../utils/time.js';

export interface GtfsStop {
  stop_id: string;
  name: string;
  lat: number;
  lon: number;
  wheelchair_boarding: number;
}

export interface GtfsRoute {
  route_id: string;
  agency_id: string;
  short_name: string;
  long_name: string;
  route_type: number;
  color: string;
}

export interface GtfsTrip {
  trip_id: string;
  route_id: string;
  service_id: string;
  headsign: string;
  direction_id: number;
  shape_id: string;
}

export interface GtfsStopTime {
  trip_id: string;
  stop_sequence: number;
  stop_id: string;
  arrival_sec: number;
  departure_sec: number;
}

export interface GtfsCalendar {
  service_id: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  start_date: string;
  end_date: string;
}

export interface GtfsShapePoint {
  shape_id: string;
  sequence: number;
  lat: number;
  lon: number;
}

export interface GtfsTransfer {
  from_stop: string;
  to_stop: string;
  min_transfer_sec: number;
}

export interface ParsedGtfsDataset {
  agencies: any[];
  stops: GtfsStop[];
  routes: GtfsRoute[];
  trips: GtfsTrip[];
  stopTimes: GtfsStopTime[];
  calendar: GtfsCalendar[];
  shapes: GtfsShapePoint[];
  transfers: GtfsTransfer[];
}

export function parseGtfsDirectory(dirPath: string): ParsedGtfsDataset {
  const readCsv = (fileName: string) => {
    const fullPath = path.join(dirPath, fileName);
    if (!fs.existsSync(fullPath)) return [];
    const content = fs.readFileSync(fullPath, 'utf-8');
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  };

  const agencyRows = readCsv('agency.txt');
  const agencies = agencyRows.map((r: any) => ({
    agency_id: r.agency_id || 'BEST',
    name: r.agency_name || 'BEST',
    url: r.agency_url || '',
    timezone: r.agency_timezone || 'Asia/Kolkata',
  }));

  const stopRows = readCsv('stops.txt');
  const stops: GtfsStop[] = stopRows.map((r: any) => {
    const lat = parseFloat(r.stop_lat);
    const lon = parseFloat(r.stop_lon);

    // Coordinate validation for Mumbai bounds (18.8 to 19.5 N, 72.7 to 73.3 E)
    if (isNaN(lat) || isNaN(lon) || lat < 18.0 || lat > 20.0 || lon < 72.0 || lon > 74.0) {
      console.warn(`[Ingest Warning]: Stop ${r.stop_id} (${r.stop_name}) has invalid coordinates: (${lat}, ${lon})`);
    }

    return {
      stop_id: r.stop_id,
      name: r.stop_name,
      lat,
      lon,
      wheelchair_boarding: parseInt(r.wheelchair_boarding || '0', 10),
    };
  });

  const routeRows = readCsv('routes.txt');
  const routes: GtfsRoute[] = routeRows.map((r: any) => ({
    route_id: r.route_id,
    agency_id: r.agency_id || 'BEST',
    short_name: r.route_short_name || r.route_id,
    long_name: r.route_long_name || '',
    route_type: parseInt(r.route_type || '3', 10),
    color: r.route_color ? (r.route_color.startsWith('#') ? r.route_color : `#${r.route_color}`) : '#DC2626',
  }));

  const calendarRows = readCsv('calendar.txt');
  const calendar: GtfsCalendar[] = calendarRows.map((r: any) => ({
    service_id: r.service_id,
    monday: parseInt(r.monday || '1', 10),
    tuesday: parseInt(r.tuesday || '1', 10),
    wednesday: parseInt(r.wednesday || '1', 10),
    thursday: parseInt(r.thursday || '1', 10),
    friday: parseInt(r.friday || '1', 10),
    saturday: parseInt(r.saturday || '1', 10),
    sunday: parseInt(r.sunday || '1', 10),
    start_date: r.start_date || '20260101',
    end_date: r.end_date || '20261231',
  }));

  const tripRows = readCsv('trips.txt');
  const trips: GtfsTrip[] = tripRows.map((r: any) => ({
    trip_id: r.trip_id,
    route_id: r.route_id,
    service_id: r.service_id,
    headsign: r.trip_headsign || '',
    direction_id: parseInt(r.direction_id || '0', 10),
    shape_id: r.shape_id || '',
  }));

  const stopTimeRows = readCsv('stop_times.txt');
  const stopTimes: GtfsStopTime[] = stopTimeRows.map((r: any) => ({
    trip_id: r.trip_id,
    stop_sequence: parseInt(r.stop_sequence, 10),
    stop_id: r.stop_id,
    arrival_sec: timeStringToSeconds(r.arrival_time),
    departure_sec: timeStringToSeconds(r.departure_time),
  }));

  const shapeRows = readCsv('shapes.txt');
  const shapes: GtfsShapePoint[] = shapeRows.map((r: any) => ({
    shape_id: r.shape_id,
    sequence: parseInt(r.shape_pt_sequence, 10),
    lat: parseFloat(r.shape_pt_lat),
    lon: parseFloat(r.shape_pt_lon),
  }));

  const transferRows = readCsv('transfers.txt');
  const transfers: GtfsTransfer[] = transferRows.map((r: any) => ({
    from_stop: r.from_stop,
    to_stop: r.to_stop,
    min_transfer_sec: parseInt(r.min_transfer_sec || '180', 10),
  }));

  return {
    agencies,
    stops,
    routes,
    trips,
    stopTimes,
    calendar,
    shapes,
    transfers,
  };
}
