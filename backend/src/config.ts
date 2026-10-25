import 'dotenv/config';
import { z } from 'zod';

const optionalNonEmpty = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  DATABASE_URL: z.string().url().default('postgres://qeflow:qeflow@localhost:5432/qeflow'),
  APP_DATA_MODE: z.enum(['live', 'mock']).default('live'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JIRA_BASE_URL: optionalNonEmpty,
  JIRA_EMAIL: optionalNonEmpty,
  JIRA_API_TOKEN: optionalNonEmpty,
  GITHUB_TOKEN: optionalNonEmpty,
  OPENAI_API_KEY: optionalNonEmpty,
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid QEFlow-AI configuration:\n${details}`);
  }

  const jiraParts = [parsed.data.JIRA_BASE_URL, parsed.data.JIRA_EMAIL, parsed.data.JIRA_API_TOKEN];
  if (jiraParts.some(Boolean) && !jiraParts.every(Boolean)) {
    throw new Error('Invalid QEFlow-AI configuration:\n  - Jira requires JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN together.');
  }

  return parsed.data;
}
