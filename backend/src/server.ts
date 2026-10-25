import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { Pool } from 'pg';

async function start(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    // Configuration errors are deliberately limited to variable names and validation messages.
    console.error(error instanceof Error ? error.message : 'Invalid application configuration.');
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 5_000 });
  const app = buildApp(config, pool);

  try {
    await app.listen({ host: config.HOST, port: config.PORT });
  } catch (error) {
    app.log.error({ err: error }, 'Backend startup failed');
    await app.close();
    process.exitCode = 1;
  }
}

await start();
