# Transit Data Notes

## Data Sources
- **Target Network**: Mumbai Metropolitan Region Bus Transit (BEST, KDMT, TMT, VVMT).
- **Format**: General Transit Feed Specification (GTFS).
- **Core Entities**:
  - `agency.txt`: Transit agencies (e.g., BEST).
  - `stops.txt`: Physical bus stops with WGS84 coordinates (`stop_lat`, `stop_lon`).
  - `routes.txt`: Bus route definitions, names, and identifiers.
  - `trips.txt`: Specific scheduled runs for each route, linked to `service_id` and `shape_id`.
  - `stop_times.txt`: Arrival and departure times at each stop sequence. Handled as integer seconds since midnight.
  - `calendar.txt` & `calendar_dates.txt`: Days of operation and exception dates.
  - `shapes.txt`: Coordinates defining the polyline path of each trip.

## GTFS Handling Gotchas
1. **Midnight Rollover**: Times like `24:15:00` or `25:30:00` are stored as integer seconds from midnight ($24 \times 3600 + 15 \times 60 = 87300$ seconds).
2. **Coordinate Sanity**: All stop coordinates must fall within Mumbai Metropolitan Region bounding box:
   - Latitude: `[18.80, 19.50]`
   - Longitude: `[72.70, 73.25]`
3. **Footpath Transfers**: Generated via PostGIS `ST_DWithin` for stops within $300\text{--}500\text{ m}$ walking distance.
