import path from 'path';
import { fileURLToPath } from 'url';
import { parseGtfsDirectory } from './parser.js';
import { pool, query, testConnection } from '../../db/index.js';
import { runMigrations } from '../../db/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runIngest() {
  console.log('[Ingest]: Testing database connection...');
  const isConnected = await testConnection();

  if (!isConnected) {
    console.error('[Ingest Error]: Cannot connect to PostgreSQL database. Please make sure Docker or PostgreSQL is running.');
    process.exit(1);
  }

  // Ensure tables exist
  await runMigrations();

  const dataDir = path.resolve(__dirname, '../../../../data/sample-gtfs');
  console.log(`[Ingest]: Loading GTFS data from ${dataDir}...`);

  const dataset = parseGtfsDirectory(dataDir);
  console.log(`[Ingest]: Parsed ${dataset.stops.length} stops, ${dataset.routes.length} routes, ${dataset.trips.length} trips, ${dataset.stopTimes.length} stop times, ${dataset.shapes.length} shape points.`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean existing GTFS tables
    await client.query('TRUNCATE agencies, routes, calendar, calendar_dates, shapes, trips, stop_times, transfers, stops CASCADE;');

    // 1. Agencies
    for (const a of dataset.agencies) {
      await client.query(
        'INSERT INTO agencies (agency_id, name, url, timezone) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;',
        [a.agency_id, a.name, a.url, a.timezone]
      );
    }

    // 2. Stops (with PostGIS Point geometry)
    for (const s of dataset.stops) {
      await client.query(
        `INSERT INTO stops (stop_id, name, lat, lon, geom, wheelchair_boarding)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326), $5)
         ON CONFLICT (stop_id) DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom;`,
        [s.stop_id, s.name, s.lat, s.lon, s.wheelchair_boarding]
      );
    }

    // 3. Routes
    for (const r of dataset.routes) {
      await client.query(
        'INSERT INTO routes (route_id, agency_id, short_name, long_name, route_type, color) VALUES ($1, $2, $3, $4, $5, $6);',
        [r.route_id, r.agency_id, r.short_name, r.long_name, r.route_type, r.color]
      );
    }

    // 4. Calendar
    for (const c of dataset.calendar) {
      await client.query(
        `INSERT INTO calendar (service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [c.service_id, c.monday, c.tuesday, c.wednesday, c.thursday, c.friday, c.saturday, c.sunday, c.start_date, c.end_date]
      );
    }

    // 5. Shapes
    for (const sh of dataset.shapes) {
      await client.query(
        'INSERT INTO shapes (shape_id, sequence, lat, lon) VALUES ($1, $2, $3, $4);',
        [sh.shape_id, sh.sequence, sh.lat, sh.lon]
      );
    }

    // 6. Trips
    for (const t of dataset.trips) {
      await client.query(
        'INSERT INTO trips (trip_id, route_id, service_id, headsign, direction_id, shape_id) VALUES ($1, $2, $3, $4, $5, $6);',
        [t.trip_id, t.route_id, t.service_id, t.headsign, t.direction_id, t.shape_id]
      );
    }

    // 7. Stop Times
    for (const st of dataset.stopTimes) {
      await client.query(
        'INSERT INTO stop_times (trip_id, stop_sequence, stop_id, arrival_sec, departure_sec) VALUES ($1, $2, $3, $4, $5);',
        [st.trip_id, st.stop_sequence, st.stop_id, st.arrival_sec, st.departure_sec]
      );
    }

    // 8. Transfers
    for (const tr of dataset.transfers) {
      await client.query(
        'INSERT INTO transfers (from_stop, to_stop, min_transfer_sec) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;',
        [tr.from_stop, tr.to_stop, tr.min_transfer_sec]
      );
    }

    await client.query('COMMIT');
    console.log('[Ingest]: Successfully ingested all GTFS entities into PostgreSQL + PostGIS!');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Ingest Transaction Error]:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runIngest().catch((err) => {
  console.error(err);
  process.exit(1);
});
