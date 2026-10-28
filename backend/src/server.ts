import { app } from './app.js';
import { config } from './config/env.js';
import { initializeStore } from './modules/catalog/store.js';

async function start() {
  console.log('[Server]: Initializing transit catalog store...');
  const initResult = await initializeStore();
  console.log('[Server]: Store ready. Postgres status:', initResult.isPostgresReady ? 'CONNECTED' : 'STANDBY/OFFLINE');

  app.listen(config.port, () => {
    console.log(`🚀 Transit Tracker API listening on http://localhost:${config.port}`);
    console.log(`📋 Health check: http://localhost:${config.port}/api/v1/health`);
    console.log(`🚌 Stops: http://localhost:${config.port}/api/v1/stops`);
    console.log(`🗺️ Routes: http://localhost:${config.port}/api/v1/routes`);
  });
}

start().catch((err) => {
  console.error('[Server Start Failure]:', err);
  process.exit(1);
});
