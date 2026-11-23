import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

let mongo;
let server;
let base;
let accessToken;

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.PORT = '0';
  process.env.CORS_ORIGINS = 'http://localhost:4200';

  const { default: WebServer } = await import('../bin/server.js');
  const { default: User } = await import('../api/users/model.js');

  server = new WebServer();
  const port = await server.listen();
  base = `http://127.0.0.1:${port}`;

  await User.create({
    name: 'Admin',
    email: 'admin@test.local',
    passwordHash: await bcrypt.hash('password123', 10),
    role: 'admin'
  });

  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.local', password: 'password123' })
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  accessToken = body.data.accessToken;
});

after(async () => {
  await mongoose.disconnect().catch(() => {});
  if (server) await new Promise((resolve) => server.server.close(resolve));
  if (mongo) await mongo.stop();
});

test('health check responde', async () => {
  const response = await fetch(`${base}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.status, 'ok');
});

test('crear Work sin token es rechazado', async () => {
  const response = await fetch(`${base}/api/works`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Sin autor', composer: 'Nadie' })
  });
  assert.equal(response.status, 401);
});

test('validación de campos devuelve 400', async () => {
  const response = await fetch(`${base}/api/works`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ title: 'Sin compositor' })
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});

test('admin crea Works y el público solo ve publicados', async () => {
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` };

  const published = await fetch(`${base}/api/works`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Ave María', composer: 'Gounod', isPublished: true })
  });
  assert.equal(published.status, 201, await published.text());

  const draft = await fetch(`${base}/api/works`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Borrador', composer: 'Anónimo', isPublished: false })
  });
  assert.equal(draft.status, 201, await draft.text());

  const publicList = await (await fetch(`${base}/api/works`)).json();
  assert.ok(publicList.data.items.every((item) => item.isPublished === true));

  const adminList = await (await fetch(`${base}/api/works`, { headers: { authorization: `Bearer ${accessToken}` } })).json();
  assert.ok(adminList.data.total >= 2);
});

test('ruta desconocida devuelve 404 en JSON', async () => {
  const response = await fetch(`${base}/api/ruta-inexistente`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'NOT_FOUND');
});
