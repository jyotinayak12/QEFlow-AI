import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool } from 'pg';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig({ NODE_ENV: 'test' });

test('health endpoint is available without connecting to integrations', async () => {
  const app = buildApp(config, new Pool({ connectionString: config.DATABASE_URL }));
  try {
    const response = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok', service: 'qeflow-ai-backend' });
  } finally {
    await app.close();
  }
});

test('unknown routes use the standard error envelope', async () => {
  const app = buildApp(config, new Pool({ connectionString: config.DATABASE_URL }));
  try {
    const response = await app.inject({ method: 'GET', url: '/missing' });
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.json(), {
      error: {
        code: 'not_found',
        message: 'The requested resource was not found.',
        details: {},
        request_id: response.json().error.request_id,
      },
    });
  } finally {
    await app.close();
  }
});
