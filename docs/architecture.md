# Architecture & System Design

## Overview
Smart Public Transport & Crowd Tracker is a modular monolith designed for Mumbai bus transit (BEST and neighbouring operators: KDMT, TMT, VVMT). It combines timetable-aware routing, crowd estimation, simulated real-time tracking, and structured AI search.

## Modules
- **`ingest`**: Validates, normalizes, and loads GTFS data into PostgreSQL with PostGIS geometries.
- **`catalog`**: High-performance querying of agencies, routes, stops, trips, and scheduled departures.
- **`routing`**: Timetable-aware routing engine using Dijkstra on toy graph and Connection Scan Algorithm (CSA) for multi-criteria journey planning (Fastest, Fewest Transfers, Least Crowded).
- **`simulation`**: Physics-based/tick-based vehicle progression along route shapes with delay models, marked explicitly with `mode: 'simulated'`.
- **`crowd`**: Rule-based baseline crowd estimation plus crowdsourced commuter reports with trust rules.
- **`ai`**: Natural language parameter extractor with structured JSON output, keeping the routing engine as the single source of truth.
- **`alerts`**: Service disruptions and advisory notices.

## Data Flow
```
GTFS Feed / Sample Data
        │
        ▼ (ingestion & validation)
  PostgreSQL + PostGIS
        │
        ├─────────────────────────────┐
        ▼                             ▼
In-Memory Timetable (CSA)     Spatial Indices (GIST / pg_trgm)
        │                             │
        ▼                             ▼
Journey Planning API           Stops & Routes Catalog API
        │                             │
        └──────────────┬──────────────┘
                       ▼
              REST / SSE Server
                       │
                       ▼
              React + Leaflet UI
```
