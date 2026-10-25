import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from './config.js';

const baseEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/qeflow',
};

test('loads safe defaults without requiring optional integrations', () => {
  const config = loadConfig(baseEnv);
  assert.equal(config.PORT, 8000);
  assert.equal(config.APP_DATA_MODE, 'live');
  assert.equal(config.JIRA_API_TOKEN, undefined);
});

test('rejects partial Jira credential configuration without exposing values', () => {
  assert.throws(
    () => loadConfig({ ...baseEnv, JIRA_EMAIL: 'user@example.test', JIRA_API_TOKEN: 'do-not-print' }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /JIRA_BASE_URL/);
      assert.doesNotMatch(error.message, /do-not-print/);
      return true;
    },
  );
});

test('accepts explicit mock mode', () => {
  assert.equal(loadConfig({ ...baseEnv, APP_DATA_MODE: 'mock' }).APP_DATA_MODE, 'mock');
});

test('treats blank optional integration settings as not configured', () => {
  const config = loadConfig({ ...baseEnv, JIRA_BASE_URL: '', JIRA_EMAIL: '', JIRA_API_TOKEN: '' });
  assert.equal(config.JIRA_BASE_URL, undefined);
  assert.equal(config.JIRA_API_TOKEN, undefined);
});

test('rejects a malformed database URL without echoing its value', () => {
  assert.throws(
    () => loadConfig({ ...baseEnv, DATABASE_URL: 'not-a-url-secret' }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /DATABASE_URL/);
      assert.doesNotMatch(error.message, /not-a-url-secret/);
      return true;
    },
  );
});
