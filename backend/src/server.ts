import cors from '@fastify/cors';
import Fastify from 'fastify';

const server = Fastify({
  logger: true,
});

await server.register(cors, {
  origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
});

server.get('/health', async () => ({
  ok: true,
  service: 'drawaflag-api',
}));

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
