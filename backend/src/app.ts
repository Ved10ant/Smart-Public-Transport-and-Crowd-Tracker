import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { catalogRouter } from './modules/catalog/routes.js';
import { routingRouter } from './modules/routing/routes.js';
import { testConnection } from './db/index.js';

export const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalEnd = _res.end;
  _res.end = function (...args: any[]) {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - ${_res.statusCode} (${duration}ms)`);
    return originalEnd.apply(_res, args as any);
  };
  next();
});

// Health check endpoint
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  const dbOk = await testConnection();
  res.json({
    status: 'healthy',
    mode: 'scheduled',
    service: 'Smart Public Transport & Crowd Tracker API',
    version: '1.0.0',
    database: {
      connected: dbOk,
      type: 'PostgreSQL + PostGIS',
    },
    timestamp: new Date().toISOString(),
  });
});

// Catalog routes
app.use('/api/v1', catalogRouter);
app.use('/api/v1', routingRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});
