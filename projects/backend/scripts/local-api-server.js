/**
 * Servidor local de demostración con MongoDB en memoria.
 * Útil para ejecutar las colecciones de Postman/Bruno sin instalar MongoDB.
 * Los datos se pierden al detener el proceso.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const mongo = await MongoMemoryServer.create();
process.env.MONGO_URI = mongo.getUri();
process.env.JWT_ACCESS_SECRET ||= 'local-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'local-refresh-secret';
process.env.CORS_ORIGINS ||= 'http://localhost:4200,http://localhost:5173';

const { default: WebServer } = await import('../bin/server.js');
const { default: User } = await import('../api/users/model.js');

const server = new WebServer();
const port = await server.listen();

const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD || 'CoroUnefa2026!', 10);
const users = [
  { name: 'Administrador', email: 'admin@coro.local', role: 'admin' },
  { name: 'Editor', email: 'editor@coro.local', role: 'editor' },
  { name: 'Corista', email: 'viewer@coro.local', role: 'viewer' }
];

for (const user of users) {
  await User.updateOne(
    { email: user.email },
    { $setOnInsert: { ...user, passwordHash, isActive: true } },
    { upsert: true }
  );
}

console.log(`[local-api] usuarios listos · Base URL: http://127.0.0.1:${port}`);

async function shutdown() {
  await mongoose.disconnect().catch(() => {});
  server.server.closeAllConnections?.();
  await new Promise((resolve) => server.server.close(resolve));
  await mongo.stop().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
