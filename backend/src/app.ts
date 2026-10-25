import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import type { AppConfig } from './config.js';
import { getIntegrationStatuses } from './integrations/status.js';

export function buildApp(config: AppConfig, pool: Pool): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        censor: '[REDACTED]',
      },
    },
  });

  app.register(cors, { origin: config.CORS_ORIGIN.split(',').map((origin) => origin.trim()) });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      { errorName: error.name, statusCode: error.statusCode, requestId: request.id },
      'Request failed',
    );
    const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;
    reply.status(statusCode).send({
      error: {
        code: statusCode >= 500 ? 'internal_error' : 'request_error',
        message: statusCode >= 500 ? 'The request could not be completed.' : error.message,
        details: {},
        request_id: request.id,
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'not_found',
        message: 'The requested resource was not found.',
        details: {},
        request_id: request.id,
      },
    });
  });

  app.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', service: 'qeflow-ai-backend' });
  });

  app.get('/integrations/status', async (request, reply) => {
    const statuses = await getIntegrationStatuses(config, pool);
    const hasUnavailable = Object.values(statuses).some(
      (value) => typeof value === 'object' && ['unreachable', 'unauthorized'].includes(value.status),
    );
    return reply.status(hasUnavailable ? 503 : 200).send(statuses);
  });

  app.addHook('onClose', async () => {
    await pool.end();
  });

  return app;
}
