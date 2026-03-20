import 'dotenv/config';
import Fastify from 'fastify';
import prismaPlugin from './plugins/prisma.ts';
import apiKeyPlugin from './plugins/apiKey.ts';

const fastify = Fastify({ logger: true });

await fastify.register(prismaPlugin);
await fastify.register(apiKeyPlugin);

fastify.get('/', async () => ({ status: 'ok' }));

try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
