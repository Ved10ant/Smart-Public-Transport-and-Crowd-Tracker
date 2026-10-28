import { query, testConnection } from '../../db/index.js';
import { ParsedGtfsDataset, parseGtfsDirectory } from '../ingest/parser.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCurrentTimeSeconds, secondsToTimeString } from '../../utils/time.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory fallback and fast cache
let memoryDataset: ParsedGtfsDataset | null = null;
let isPostgresReady = false;

export async function initializeStore() {
  isPostgresReady = await testConnection();

  // Load sample dataset into memory cache regardless (useful for instant responses and CSA algorithm in Phase 2)
  const samplePath = path.resolve(__dirname, '../../../../data/sample-gtfs');
  try {
    memoryDataset = parseGtfsDirectory(samplePath);
    console.log(`[Catalog Store]: Loaded in-memory cache with ${memoryDataset.stops.length} stops and ${memoryDataset.routes.length} routes.`);
  } catch (err: any) {
    console.warn('[Catalog Store Warning]: Could not load sample GTFS into memory:', err.message);
  }

  return { isPostgresReady, memoryLoaded: !!memoryDataset };
}

export function getMemoryDataset(): ParsedGtfsDataset | null {
  return memoryDataset;
}

export async function searchStops(params: { q?: string; lat?: number; lon?: number; radius?: number }) {
  const { q, lat, lon, radius = 2000 } = params;

  if (isPostgresReady) {
    try {
      if (lat !== undefined && lon !== undefined) {
        const sql = `
          SELECT stop_id, name, lat, lon, wheelchair_boarding,
                 ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) as distance_meters
          FROM stops
          WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
          ORDER BY distance_meters ASC
          LIMIT 50;
        `;
        const res = await query(sql, [lat, lon, radius]);
        return res.rows;
      }

      if (q && q.trim()) {
        const sql = `
          SELECT stop_id, name, lat, lon, wheelchair_boarding,
                 similarity(name, $1) as score
          FROM stops
          WHERE name ILIKE '%' || $1 || '%' OR similarity(name, $1) > 0.2
          ORDER BY similarity(name, $1) DESC
          LIMIT 50;
        `;
        const res = await query(sql, [q.trim()]);
        return res.rows;
      }

      const res = await query('SELECT stop_id, name, lat, lon, wheelchair_boarding FROM stops ORDER BY name ASC LIMIT 100;');
      return res.rows;
    } catch (e: any) {
      console.warn('[Store]: Postgres query failed, falling back to memory store:', e.message);
    }
  }

  // Fallback to in-memory dataset
  if (!memoryDataset) return [];

  let results = [...memoryDataset.stops];

  if (lat !== undefined && lon !== undefined) {
    results = results
      .map((s) => {
        // Haversine approx
        const dLat = (s.lat - lat) * 111320;
        const dLon = (s.lon - lon) * (111320 * Math.cos((lat * Math.PI) / 180));
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        return { ...s, distance_meters: Math.round(dist) };
      })
      .filter((s: any) => s.distance_meters <= radius)
      .sort((a: any, b: any) => a.distance_meters - b.distance_meters);
    return results;
  }

  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    results = results.filter((s) => s.name.toLowerCase().includes(term) || s.stop_id.toLowerCase().includes(term));
  }

  return results.slice(0, 50);
}

export async function getStopById(stopId: string) {
  if (isPostgresReady) {
    try {
      const res = await query('SELECT * FROM stops WHERE stop_id = $1', [stopId]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (e) {
      // fallback
    }
  }

  if (!memoryDataset) return null;
  return memoryDataset.stops.find((s) => s.stop_id === stopId) || null;
}

export async function getStopDepartures(stopId: string, timeSec?: number) {
  const queryTime = timeSec !== undefined ? timeSec : getCurrentTimeSeconds();

  if (!memoryDataset) return [];

  // Find stop times at or after queryTime
  const upcomingTimes = memoryDataset.stopTimes
    .filter((st) => st.stop_id === stopId && st.departure_sec >= queryTime - 300) // include just left 5 min ago
    .sort((a, b) => a.departure_sec - b.departure_sec)
    .slice(0, 20);

  const departures = upcomingTimes.map((st) => {
    const trip = memoryDataset!.trips.find((t) => t.trip_id === st.trip_id);
    const route = trip ? memoryDataset!.routes.find((r) => r.route_id === trip.route_id) : null;

    // Rule-based crowd estimate
    const hour = Math.floor(st.departure_sec / 3600) % 24;
    const isPeak = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20);
    const crowdLevel = isPeak ? 'high' : hour >= 12 && hour <= 16 ? 'medium' : 'low';

    return {
      trip_id: st.trip_id,
      route_id: route?.route_id || '',
      route_short_name: route?.short_name || 'BEST',
      route_long_name: route?.long_name || '',
      route_color: route?.color || '#DC2626',
      headsign: trip?.headsign || '',
      departure_sec: st.departure_sec,
      departure_time_str: secondsToTimeString(st.departure_sec, true),
      eta_minutes: Math.max(0, Math.round((st.departure_sec - queryTime) / 60)),
      mode: 'scheduled', // Scheduled / Simulated / Live
      crowd_estimate: {
        level: crowdLevel,
        confidence: 0.8,
        source: 'Historical peak-hour rule, estimated',
      },
    };
  });

  return departures;
}

export async function getRoutesList() {
  if (isPostgresReady) {
    try {
      const res = await query('SELECT * FROM routes ORDER BY short_name ASC');
      return res.rows;
    } catch (e) {}
  }
  return memoryDataset?.routes || [];
}

export async function getRouteDetails(routeId: string) {
  if (!memoryDataset) return null;

  const route = memoryDataset.routes.find((r) => r.route_id === routeId);
  if (!route) return null;

  // Find trips for this route
  const trips = memoryDataset.trips.filter((t) => t.route_id === routeId);
  const sampleTrip = trips[0];

  let stops: any[] = [];
  let shape: any[] = [];

  if (sampleTrip) {
    const tripStopTimes = memoryDataset.stopTimes
      .filter((st) => st.trip_id === sampleTrip.trip_id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence);

    stops = tripStopTimes.map((st) => {
      const stopInfo = memoryDataset!.stops.find((s) => s.stop_id === st.stop_id);
      return {
        sequence: st.stop_sequence,
        stop_id: st.stop_id,
        name: stopInfo?.name || st.stop_id,
        lat: stopInfo?.lat || 0,
        lon: stopInfo?.lon || 0,
        arrival_sec: st.arrival_sec,
        departure_sec: st.departure_sec,
        time_str: secondsToTimeString(st.departure_sec, true),
      };
    });

    if (sampleTrip.shape_id) {
      shape = memoryDataset.shapes
        .filter((sh) => sh.shape_id === sampleTrip.shape_id)
        .sort((a, b) => a.sequence - b.sequence)
        .map((sh) => [sh.lat, sh.lon]);
    }
  }

  return {
    ...route,
    trips_count: trips.length,
    stops,
    shape,
  };
}
