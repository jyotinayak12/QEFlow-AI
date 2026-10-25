import type { Pool } from 'pg';
import type { AppConfig } from '../config.js';

export type IntegrationStatus = 'ok' | 'degraded' | 'unreachable' | 'unauthorized' | 'not_configured';

export interface IntegrationHealth {
  status: IntegrationStatus;
  detail: string;
}

export interface IntegrationStatuses {
  jira: IntegrationHealth;
  github: IntegrationHealth;
  playwright: IntegrationHealth;
  llm: IntegrationHealth;
  database: IntegrationHealth;
  dataMode: 'live' | 'mock';
}

const pendingAdapter: IntegrationHealth = {
  status: 'not_configured',
  detail: 'Adapter connectivity checks are not implemented in Stage 0.',
};

export async function getIntegrationStatuses(
  config: AppConfig,
  pool: Pick<Pool, 'query'>,
): Promise<IntegrationStatuses> {
  let database: IntegrationHealth;
  try {
    await pool.query('SELECT 1');
    database = { status: 'ok', detail: 'PostgreSQL connection succeeded.' };
  } catch {
    database = { status: 'unreachable', detail: 'PostgreSQL connection failed; see sanitized server logs.' };
  }

  const jiraConfigured = Boolean(config.JIRA_BASE_URL && config.JIRA_EMAIL && config.JIRA_API_TOKEN);
  const configuredButPending: IntegrationHealth = {
    status: 'degraded',
    detail: 'Credentials are configured, but the integration adapter is not implemented in Stage 0.',
  };

  return {
    jira: jiraConfigured ? configuredButPending : { status: 'not_configured', detail: 'Jira credentials are not configured.' },
    github: config.GITHUB_TOKEN ? configuredButPending : { status: 'not_configured', detail: 'GitHub credentials are not configured.' },
    playwright: pendingAdapter,
    llm: config.OPENAI_API_KEY ? configuredButPending : { status: 'not_configured', detail: 'LLM credentials are not configured.' },
    database,
    dataMode: config.APP_DATA_MODE,
  };
}
