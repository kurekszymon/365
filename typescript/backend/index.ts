import 'dotenv/config';
import Fastify from 'fastify';
import { PrismaClient } from './generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const fastify = Fastify({ logger: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

fastify.decorate('prisma', prisma);

fastify.addHook('onClose', async () => {
  await fastify.prisma.$disconnect();
});

fastify.get('/', async function handler(request, reply) {
  return { hello: 'world' };
});

fastify.get('/users', async function handler(request, reply) {
  return fastify.prisma.user.findMany();
});

fastify.get('/posts', async function handler(request, reply) {
  return fastify.prisma.post.count();
});

try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}