-- Extensions for spatial operations and fuzzy text searching
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Agencies
CREATE TABLE IF NOT EXISTS agencies (
  agency_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata'
);

-- 2. Stops
CREATE TABLE IF NOT EXISTS stops (
  stop_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  parent_station VARCHAR(50),
  wheelchair_boarding INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stops_geom ON stops USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_stops_name_trgm ON stops USING GIN(name gin_trgm_ops);

-- 3. Routes
CREATE TABLE IF NOT EXISTS routes (
  route_id VARCHAR(50) PRIMARY KEY,
  agency_id VARCHAR(50) REFERENCES agencies(agency_id) ON DELETE SET NULL,
  short_name VARCHAR(50) NOT NULL,
  long_name VARCHAR(255) NOT NULL,
  route_type INT DEFAULT 3, -- 3 = Bus
  color VARCHAR(10) DEFAULT '#DC2626'
);

CREATE INDEX IF NOT EXISTS idx_routes_short_name ON routes(short_name);

-- 4. Calendar (Service Schedules)
CREATE TABLE IF NOT EXISTS calendar (
  service_id VARCHAR(50) PRIMARY KEY,
  monday INT NOT NULL DEFAULT 1,
  tuesday INT NOT NULL DEFAULT 1,
  wednesday INT NOT NULL DEFAULT 1,
  thursday INT NOT NULL DEFAULT 1,
  friday INT NOT NULL DEFAULT 1,
  saturday INT NOT NULL DEFAULT 1,
  sunday INT NOT NULL DEFAULT 1,
  start_date VARCHAR(8) NOT NULL,
  end_date VARCHAR(8) NOT NULL
);

CREATE TABLE IF NOT EXISTS calendar_dates (
  service_id VARCHAR(50) NOT NULL,
  date VARCHAR(8) NOT NULL,
  exception_type INT NOT NULL, -- 1 = added, 2 = removed
  PRIMARY KEY (service_id, date)
);

-- 5. Shapes (Polylines for map visualization)
CREATE TABLE IF NOT EXISTS shapes (
  shape_id VARCHAR(50) NOT NULL,
  sequence INT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (shape_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_shapes_id ON shapes(shape_id);

-- 6. Trips
CREATE TABLE IF NOT EXISTS trips (
  trip_id VARCHAR(50) PRIMARY KEY,
  route_id VARCHAR(50) NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  service_id VARCHAR(50) NOT NULL,
  headsign VARCHAR(255),
  direction_id INT DEFAULT 0,
  shape_id VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_trips_route_id ON trips(route_id);
CREATE INDEX IF NOT EXISTS idx_trips_service_id ON trips(service_id);

-- 7. Stop Times
CREATE TABLE IF NOT EXISTS stop_times (
  trip_id VARCHAR(50) NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
  stop_sequence INT NOT NULL,
  stop_id VARCHAR(50) NOT NULL REFERENCES stops(stop_id) ON DELETE CASCADE,
  arrival_sec INT NOT NULL,
  departure_sec INT NOT NULL,
  PRIMARY KEY (trip_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_stop_times_stop_departure ON stop_times(stop_id, departure_sec);
CREATE INDEX IF NOT EXISTS idx_stop_times_trip ON stop_times(trip_id, stop_sequence);

-- 8. Transfers (walking connections)
CREATE TABLE IF NOT EXISTS transfers (
  from_stop VARCHAR(50) NOT NULL REFERENCES stops(stop_id) ON DELETE CASCADE,
  to_stop VARCHAR(50) NOT NULL REFERENCES stops(stop_id) ON DELETE CASCADE,
  min_transfer_sec INT NOT NULL DEFAULT 180,
  PRIMARY KEY (from_stop, to_stop)
);

-- 9. Crowd Estimates (Baseline & rule-based)
CREATE TABLE IF NOT EXISTS crowd_estimates (
  id SERIAL PRIMARY KEY,
  route_id VARCHAR(50) REFERENCES routes(route_id) ON DELETE CASCADE,
  trip_id VARCHAR(50) REFERENCES trips(trip_id) ON DELETE CASCADE,
  hour_bucket INT NOT NULL, -- 0 to 23
  day_type VARCHAR(20) NOT NULL DEFAULT 'weekday', -- weekday / weekend
  level VARCHAR(20) NOT NULL, -- low, medium, high
  source VARCHAR(100) NOT NULL DEFAULT 'historical_rule',
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.75,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Vehicle Positions (Simulated & Live)
CREATE TABLE IF NOT EXISTS vehicle_positions (
  id SERIAL PRIMARY KEY,
  trip_id VARCHAR(50) REFERENCES trips(trip_id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  delay_sec INT DEFAULT 0,
  mode VARCHAR(20) NOT NULL DEFAULT 'simulated', -- simulated / live
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  route_id VARCHAR(50) REFERENCES routes(route_id) ON DELETE SET NULL,
  stop_id VARCHAR(50) REFERENCES stops(stop_id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning', -- info, warning, severe
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP WITH TIME ZONE,
  source VARCHAR(50) DEFAULT 'system'
);
