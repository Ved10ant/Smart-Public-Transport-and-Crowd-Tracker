import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  searchStops,
  getStopById,
  getStopDepartures,
  getRoutesList,
  getRouteDetails,
} from './store.js';

export const catalogRouter = Router();

const StopsQuerySchema = z.object({
  q: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(10).max(50000).optional(),
});

// GET /api/v1/stops
catalogRouter.get('/stops', async (req: Request, res: Response) => {
  try {
    const parsed = StopsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.format() });
    }

    const stops = await searchStops(parsed.data);
    res.json({
      count: stops.length,
      stops,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to search stops', message: err.message });
  }
});

// GET /api/v1/stops/:id
catalogRouter.get('/stops/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stop = await getStopById(id);
    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    res.json(stop);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch stop', message: err.message });
  }
});

// GET /api/v1/stops/:id/departures?time=
catalogRouter.get('/stops/:id/departures', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const timeParam = req.query.time ? parseInt(req.query.time as string, 10) : undefined;
    const departures = await getStopDepartures(id, timeParam);
    res.json({
      stop_id: id,
      count: departures.length,
      departures,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch departures', message: err.message });
  }
});

// GET /api/v1/routes
catalogRouter.get('/routes', async (_req: Request, res: Response) => {
  try {
    const routes = await getRoutesList();
    res.json({
      count: routes.length,
      routes,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch routes', message: err.message });
  }
});

// GET /api/v1/routes/:id
catalogRouter.get('/routes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const route = await getRouteDetails(id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(route);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch route details', message: err.message });
  }
});
