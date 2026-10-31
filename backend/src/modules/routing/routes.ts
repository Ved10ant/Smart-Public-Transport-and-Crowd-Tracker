import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { runCSA } from './csa.js';
import { getCurrentTimeSeconds, secondsToTimeString } from '../../utils/time.js';

export const routingRouter = Router();

// Zod schema — validates the POST body
const JourneyRequestSchema = z.object({
  from_stop_id:     z.string().min(1),
  to_stop_id:       z.string().min(1),
  depart_after_sec: z.coerce.number().int().min(0).optional(),
  criteria:         z.enum(['fastest', 'fewest_transfers', 'least_crowded']).optional(),
  max_transfers:    z.coerce.number().int().min(0).max(6).optional(),
});

// POST /api/v1/journey
routingRouter.post('/journey', (req: Request, res: Response) => {
  const parsed = JourneyRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation error', details: parsed.error.format() });
  }

  const {
    from_stop_id,
    to_stop_id,
    depart_after_sec = getCurrentTimeSeconds(),
    criteria         = 'fastest',
    max_transfers    = 3,
  } = parsed.data;

  if (from_stop_id === to_stop_id) {
    return res.status(400).json({ error: 'Origin and destination must be different stops.' });
  }

  const journey = runCSA(from_stop_id, to_stop_id, depart_after_sec, criteria, max_transfers);

  if (!journey) {
    return res.status(404).json({
      error: 'No journey found',
      message: 'No viable route between these stops at the requested time. Try a different time or allow more transfers.',
    });
  }

  // Add human-readable time strings to each leg before sending
  const legsWithTime = journey.legs.map(leg => ({
    ...leg,
    dep_time_str: secondsToTimeString(leg.dep_sec, true),
    arr_time_str: secondsToTimeString(leg.arr_sec, true),
  }));

  res.json({
    ...journey,
    depart_time_str: secondsToTimeString(journey.depart_after_sec, true),
    arrive_time_str: secondsToTimeString(journey.arrive_at_sec, true),
    legs: legsWithTime,
  });
});