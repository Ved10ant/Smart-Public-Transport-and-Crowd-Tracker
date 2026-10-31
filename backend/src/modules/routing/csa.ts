import { MinHeap } from '../catalog/minHeap.js';
import { getMemoryDataset } from '../catalog/store.js';
import { getCurrentTimeSeconds } from '../../utils/time.js';
import {
  Connection, Transfer, StopState,
  Journey, JourneyLeg, JourneyCriteria,
} from './types.js';

// ── Helper: rule-based crowd level based on hour of day ──────────────────────
function crowdLevel(depSec: number): 'low' | 'medium' | 'high' {
  const hour = Math.floor(depSec / 3600) % 24;
  const isPeak = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20);
  return isPeak ? 'high' : hour >= 12 && hour <= 16 ? 'medium' : 'low';
}

const CROWD_SCORE: Record<string, number> = { low: 1, medium: 2, high: 3 };

// ── Build a flat list of all Connections from the in-memory GTFS dataset ──────
// A "connection" = one vehicle departing one stop and arriving at the next stop.
export function buildConnections(): Connection[] {
  const dataset = getMemoryDataset();
  if (!dataset) return [];

  // Sort stop_times by trip_id then sequence so we can pair consecutive stops
  const sorted = [...dataset.stopTimes].sort((a, b) =>
    a.trip_id === b.trip_id
      ? a.stop_sequence - b.stop_sequence
      : a.trip_id.localeCompare(b.trip_id)
  );

  const connections: Connection[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];

    // Only pair consecutive stops within the SAME trip
    if (curr.trip_id !== next.trip_id) continue;

    const trip  = dataset.trips.find(t => t.trip_id === curr.trip_id);
    const route = trip ? dataset.routes.find(r => r.route_id === trip.route_id) : null;

    connections.push({
      trip_id:          curr.trip_id,
      route_id:         route?.route_id  || '',
      route_short_name: route?.short_name || '',
      route_color:      route?.color     || '#DC2626',
      from_stop_id:     curr.stop_id,
      to_stop_id:       next.stop_id,
      dep_sec:          curr.departure_sec,
      arr_sec:          next.arrival_sec,
      stop_sequence:    curr.stop_sequence,
      crowd_level:      crowdLevel(curr.departure_sec),
    });
  }

  // CSA requires connections sorted by departure time
  connections.sort((a, b) => a.dep_sec - b.dep_sec);
  return connections;
}

// ── Main CSA function ─────────────────────────────────────────────────────────
export function runCSA(
  fromStopId: string,
  toStopId:   string,
  departAfterSec: number,
  criteria:   JourneyCriteria = 'fastest',
  maxTransfers = 3,
): Journey | null {
  const dataset = getMemoryDataset();
  if (!dataset) return null;

  const connections = buildConnections();
  const transfers:   Transfer[] = dataset.transfers;

  // Stop state map: stopId → best known state
  const state = new Map<string, StopState>();

  const getState = (stopId: string): StopState =>
    state.get(stopId) ?? {
      earliest_arrival:   Infinity,
      transfers:          Infinity,
      crowd_score:        Infinity,
      entering_connection: null,
      from_transfer:       null,
    };

  // Seed origin stop
  state.set(fromStopId, {
    earliest_arrival:   departAfterSec,
    transfers:          0,
    crowd_score:        0,
    entering_connection: null,
    from_transfer:       null,
  });

  // Trips we've already boarded (so we don't count re-boarding as a transfer)
  const boardedTrips = new Set<string>();

  // ── Scan every connection in departure-time order ─────────────────────────
  for (const conn of connections) {
    // Skip connections that depart before we can possibly board
    if (conn.dep_sec < departAfterSec) continue;

    const fromState = getState(conn.from_stop_id);
    if (fromState.earliest_arrival > conn.dep_sec) continue; // can't catch this bus

    const isAlreadyOnTrip = boardedTrips.has(conn.trip_id);
    const transferCount   = isAlreadyOnTrip
      ? fromState.transfers
      : fromState.transfers + 1;

    if (transferCount > maxTransfers + 1) continue; // too many transfers

    // Compare arrival at destination with what we already know
    const toState = getState(conn.to_stop_id);

    let isBetter = false;
    if (criteria === 'fastest') {
      isBetter = conn.arr_sec < toState.earliest_arrival;
    } else if (criteria === 'fewest_transfers') {
      isBetter =
        transferCount < toState.transfers ||
        (transferCount === toState.transfers && conn.arr_sec < toState.earliest_arrival);
    } else {
      // least_crowded: minimise crowd score, break ties by arrival
      const newScore = fromState.crowd_score + CROWD_SCORE[conn.crowd_level];
      isBetter =
        newScore < toState.crowd_score ||
        (newScore === toState.crowd_score && conn.arr_sec < toState.earliest_arrival);
    }

    if (isBetter) {
      const newScore = fromState.crowd_score + CROWD_SCORE[conn.crowd_level];
      state.set(conn.to_stop_id, {
        earliest_arrival:    conn.arr_sec,
        transfers:           transferCount,
        crowd_score:         criteria === 'least_crowded' ? newScore : toState.crowd_score,
        entering_connection: conn,
        from_transfer:       null,
      });
      boardedTrips.add(conn.trip_id);
    }

    // ── Propagate walking transfers from conn.to_stop_id ─────────────────
    const walkFrom = getState(conn.to_stop_id);
    for (const tr of transfers) {
      if (tr.from_stop !== conn.to_stop_id) continue;
      const walkArrival = conn.arr_sec + tr.min_transfer_sec;
      const walkTo      = getState(tr.to_stop);
      if (walkArrival < walkTo.earliest_arrival) {
        state.set(tr.to_stop, {
          earliest_arrival:    walkArrival,
          transfers:           walkFrom.transfers,
          crowd_score:         walkFrom.crowd_score,
          entering_connection: null,
          from_transfer:       tr,
        });
      }
    }
  }

  // ── Check if destination was reached ─────────────────────────────────────
  const destState = state.get(toStopId);
  if (!destState || destState.earliest_arrival === Infinity) return null;

  // ── Reconstruct path (walk backwards) ────────────────────────────────────
  const legs: JourneyLeg[] = [];
  let currentStopId = toStopId;

  while (currentStopId !== fromStopId) {
    const curr = state.get(currentStopId)!;

    if (curr.entering_connection) {
      const conn = curr.entering_connection;
      const fromStop = dataset.stops.find(s => s.stop_id === conn.from_stop_id);
      const toStop   = dataset.stops.find(s => s.stop_id === conn.to_stop_id);
      const trip     = dataset.trips.find(t => t.trip_id === conn.trip_id);

      legs.unshift({
        type:             'transit',
        from_stop_id:     conn.from_stop_id,
        from_stop_name:   fromStop?.name || conn.from_stop_id,
        to_stop_id:       conn.to_stop_id,
        to_stop_name:     toStop?.name   || conn.to_stop_id,
        dep_sec:          conn.dep_sec,
        arr_sec:          conn.arr_sec,
        duration_sec:     conn.arr_sec - conn.dep_sec,
        trip_id:          conn.trip_id,
        route_id:         conn.route_id,
        route_short_name: conn.route_short_name,
        route_color:      conn.route_color,
        headsign:         trip?.headsign || '',
        crowd_level:      conn.crowd_level,
        mode:             'scheduled',
      });
      currentStopId = conn.from_stop_id;
    } else if (curr.from_transfer) {
      const tr       = curr.from_transfer;
      const fromStop = dataset.stops.find(s => s.stop_id === tr.from_stop);
      const toStop   = dataset.stops.find(s => s.stop_id === tr.to_stop);
      const fromSt   = state.get(tr.from_stop)!;

      legs.unshift({
        type:           'walk',
        from_stop_id:   tr.from_stop,
        from_stop_name: fromStop?.name || tr.from_stop,
        to_stop_id:     tr.to_stop,
        to_stop_name:   toStop?.name   || tr.to_stop,
        dep_sec:        fromSt.earliest_arrival,
        arr_sec:        fromSt.earliest_arrival + tr.min_transfer_sec,
        duration_sec:   tr.min_transfer_sec,
        mode:           'scheduled',
      });
      currentStopId = tr.from_stop;
    } else {
      break; // safety guard
    }
  }

  // Merge consecutive legs of the same trip into single legs
  const mergedLegs = mergeConsecutiveLegs(legs);

  const totalTransfers = Math.max(0, mergedLegs.filter(l => l.type === 'transit').length - 1);
  const crowdLevels    = mergedLegs.map(l => l.crowd_level).filter(Boolean);
  const overallCrowd   = crowdLevels.includes('high')
    ? 'high'
    : crowdLevels.includes('medium') ? 'medium' : 'low';

  return {
    origin_stop_id:      fromStopId,
    destination_stop_id: toStopId,
    depart_after_sec:    departAfterSec,
    arrive_at_sec:       destState.earliest_arrival,
    total_duration_sec:  destState.earliest_arrival - departAfterSec,
    total_transfers:     totalTransfers,
    criteria,
    legs:                mergedLegs,
    overall_crowd:       overallCrowd as 'low' | 'medium' | 'high',
    data_mode:           'scheduled',
  };
}

// ── Merge consecutive legs belonging to the same trip ────────────────────────
function mergeConsecutiveLegs(legs: JourneyLeg[]): JourneyLeg[] {
  if (legs.length === 0) return [];
  const merged: JourneyLeg[] = [legs[0]];

  for (let i = 1; i < legs.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = legs[i];
    if (
      prev.type     === 'transit' &&
      curr.type     === 'transit' &&
      prev.trip_id  === curr.trip_id
    ) {
      // Extend the previous leg to cover the current stop
      prev.to_stop_id   = curr.to_stop_id;
      prev.to_stop_name = curr.to_stop_name;
      prev.arr_sec      = curr.arr_sec;
      prev.duration_sec = curr.arr_sec - prev.dep_sec;
      // Worst crowd level wins
      if (CROWD_SCORE[curr.crowd_level!] > CROWD_SCORE[prev.crowd_level!]) {
        prev.crowd_level = curr.crowd_level;
      }
    } else {
      merged.push(curr);
    }
  }

  return merged;
}