import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('[Migration]: Starting database migration...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await query(sql);
    console.log('[Migration]: Successfully applied schema.sql with PostGIS and spatial indices.');
  } catch (err: any) {
    console.error('[Migration Error]:', err.message);
    throw err;
  } finally {
    // If run directly as a script
    if (process.argv[1] === __filename) {
      await pool.end();
    }
  }
}

if (process.argv[1] === __filename) {
  runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
