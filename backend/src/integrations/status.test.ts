import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../config.js';
import { getIntegrationStatuses } from './status.js';

const config = loadConfig({ NODE_ENV: 'test' });

test('reports adapters honestly as not configured or degraded', async () => {
  const pool = { query: async () => ({ rows: [{ '?column?': 1 }] }) };
  const statuses = await getIntegrationStatuses(config, pool);
  assert.equal(statuses.database.status, 'ok');
  assert.equal(statuses.jira.status, 'not_configured');
  assert.equal(statuses.github.status, 'not_configured');
  assert.equal(statuses.playwright.status, 'not_configured');
  assert.equal(statuses.llm.status, 'not_configured');
});

test('reports database failures without exposing driver details', async () => {
  const pool = { query: async () => { throw new Error('private-hostname-secret'); } };
  const statuses = await getIntegrationStatuses(config, pool);
  assert.equal(statuses.database.status, 'unreachable');
  assert.doesNotMatch(statuses.database.detail, /private-hostname-secret/);
});
