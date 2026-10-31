// ─────────────────────────────────────────────────────────────────────────────
// routing/types.ts
// All interfaces & types used by the CSA routing engine.
// ─────────────────────────────────────────────────────────────────────────────

/** Planning criterion the caller wants to optimise for. */
export type JourneyCriteria = 'fastest' | 'fewest_transfers' | 'least_crowded';

/** One atomic timetable connection: a vehicle travelling from one stop to the next. */
export interface Connection {
  trip_id: string;
  route_id: string;
  route_short_name: string;
  route_color: string;
  from_stop_id: string;
  to_stop_id: string;
  dep_sec: number;   // departure time in seconds since midnight
  arr_sec: number;   // arrival time in seconds since midnight
  stop_sequence: number;
  crowd_level: 'low' | 'medium' | 'high';
}

/** Walking transfer between two nearby stops. */
export interface Transfer {
  from_stop: string;
  to_stop: string;
  min_transfer_sec: number;
}

/** One leg of a journey — either a bus ride or a walking transfer. */
export interface JourneyLeg {
  type: 'transit' | 'walk';
  from_stop_id: string;
  from_stop_name: string;
  to_stop_id: string;
  to_stop_name: string;
  dep_sec: number;
  arr_sec: number;
  duration_sec: number;

  // Transit-only fields
  trip_id?: string;
  route_id?: string;
  route_short_name?: string;
  route_color?: string;
  headsign?: string;
  crowd_level?: 'low' | 'medium' | 'high';

  mode: 'scheduled' | 'simulated' | 'live';
}

/** The full journey result returned to the frontend. */
export interface Journey {
  origin_stop_id: string;
  destination_stop_id: string;
  depart_after_sec: number;
  arrive_at_sec: number;
  total_duration_sec: number;
  total_transfers: number;
  criteria: JourneyCriteria;
  legs: JourneyLeg[];
  overall_crowd: 'low' | 'medium' | 'high';
  data_mode: 'scheduled';
}

/** Internal per-stop state tracked while CSA scans connections. */
export interface StopState {
  earliest_arrival: number;       // best arrival time found so far
  transfers: number;              // number of vehicle changes to get here
  crowd_score: number;            // cumulative crowd score (for least_crowded)
  entering_connection: Connection | null;  // connection that brought us here
  from_transfer: Transfer | null; // walking transfer that brought us here
}

/** Shape of the POST /api/v1/journey request body. */
export interface JourneyRequest {
  from_stop_id: string;
  to_stop_id: string;
  depart_after_sec?: number;     // defaults to current time-of-day seconds
  criteria?: JourneyCriteria;   // defaults to 'fastest'
  max_transfers?: number;        // defaults to 3
}