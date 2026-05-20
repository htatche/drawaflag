import cors from '@fastify/cors';
import Fastify from 'fastify';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { COUNTRIES } from './countries.js';
import type { Country } from './countries.js';

const server = Fastify({
  logger: true,
});

const maxFlagUploadBytes = 5 * 1024 * 1024;
const flagUploadsDirectory = path.resolve('uploads/flags');

type FlagUploadParams = {
  cca2: string;
};

const allowedFlagImageTypes = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
]);

const countriesByCca2: ReadonlyMap<string, Country> = new Map(
  COUNTRIES.map((country) => [country.cca2, country]),
);

await server.register(cors, {
  origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
});

server.addContentTypeParser(
  /^image\/(?:png|jpeg|webp)$/,
  { parseAs: 'buffer', bodyLimit: maxFlagUploadBytes },
  (_request, body, done) => {
    done(null, body);
  },
);

server.get('/health', async () => ({
  ok: true,
  service: 'drawaflag-api',
}));

server.get('/countries', async () => COUNTRIES);

server.get('/countries/names', async () => COUNTRIES.map((country) => country.name));

server.post<{ Body: Buffer; Params: FlagUploadParams }>(
  '/countries/:cca2/flag',
  async (request, reply) => {
    const cca2 = request.params.cca2.toUpperCase();
    const country = countriesByCca2.get(cca2);

    if (!country) {
      return reply.code(404).send({
        error: 'Country not found',
        message: `No country found for CCA2 code "${request.params.cca2}".`,
      });
    }

    const contentType = request.headers['content-type']?.split(';', 1)[0]?.toLowerCase();
    const extension = contentType ? allowedFlagImageTypes.get(contentType) : undefined;

    if (!extension) {
      return reply.code(415).send({
        error: 'Unsupported media type',
        message: 'Upload the flag image as image/png, image/jpeg, or image/webp.',
      });
    }

    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      return reply.code(400).send({
        error: 'Missing flag image',
        message: 'Request body must contain the flag image blob.',
      });
    }

    const uploadId = randomUUID();
    const countryDirectory = path.join(flagUploadsDirectory, cca2);
    const filename = `${uploadId}.${extension}`;
    const filePath = path.join(countryDirectory, filename);

    await mkdir(countryDirectory, { recursive: true });
    await writeFile(filePath, request.body);

    return reply.code(201).send({
      ok: true,
      country,
      flag: {
        id: uploadId,
        contentType,
        size: request.body.length,
        filename,
      },
    });
  },
);

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';

try {
  await server.listen({ port, host });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
