import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Project } from '../generated/prisma/client.ts';

declare module 'fastify' {
  interface FastifyRequest {
    project: Project;
  }
}

export default fp(async function apiKeyPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('project', null);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.url.startsWith('/api/ingest')) return;

    const apiKey = request.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') {
      return reply.status(401).send({ error: 'Missing X-API-Key header' });
    }

    const project = await fastify.prisma.project.findUnique({
      where: { apiKey },
    });

    if (!project) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }

    request.project = project;
  });
});
