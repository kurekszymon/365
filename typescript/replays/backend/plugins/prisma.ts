import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async function prismaPlugin(fastify: FastifyInstance) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await fastify.prisma.$disconnect();
  });
});
