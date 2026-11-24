import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const imagesDir = fileURLToPath(new URL('../uploads/images/', import.meta.url));
const createdImagePaths = [];

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
  await Promise.allSettled(createdImagePaths.map((file) => fs.unlink(file).catch(() => {})));
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

function monumentForm(code, filename, mimeType, content = 'contenido de prueba') {
  const form = new FormData();
  form.append('title', 'Monumento con imagen');
  form.append('code', code);
  form.append('category', 'Civil');
  form.append('constructionType', 'Mampostería');
  form.append('images', new Blob([content], { type: mimeType }), filename);
  return form;
}

function trackImage(url) {
  const file = path.join(imagesDir, path.basename(url));
  createdImagePaths.push(file);
  return file;
}

test('crear monumento con imagen válida guarda el archivo y la URL', async () => {
  const form = monumentForm('MON-IMG-001', 'foto.png', 'image/png');
  const response = await fetch(`${base}/api/monuments`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: form
  });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));

  const url = body.data.images[0];
  assert.match(url, /^\/uploads\/images\/\d+-[0-9a-f]{12}\.png$/);
  await assert.doesNotReject(() => fs.access(trackImage(url)));

  const fileResponse = await fetch(`${base}${url}`);
  assert.equal(fileResponse.status, 200);
  assert.equal(await fileResponse.text(), 'contenido de prueba');
});

test('crear monumento con extensión inválida devuelve 400', async () => {
  const form = monumentForm('MON-IMG-002', 'foto.gif', 'image/gif');
  const response = await fetch(`${base}/api/monuments`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: form
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.match(body.error.message, /Extensión no permitida/);
});

test('actualizar monumento añade imágenes sin reemplazar las existentes', async () => {
  const created = await fetch(`${base}/api/monuments`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: monumentForm('MON-IMG-003', 'original.jpg', 'image/jpeg')
  });
  const createdBody = await created.json();
  assert.equal(created.status, 201, JSON.stringify(createdBody));
  const originalUrl = createdBody.data.images[0];
  trackImage(originalUrl);

  const form = monumentForm('MON-IMG-003', 'nueva.webp', 'image/webp');
  const response = await fetch(`${base}/api/monuments/${createdBody.data._id}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${accessToken}` },
    body: form
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.data.images.length, 2);
  assert.equal(body.data.images[0], originalUrl);
  assert.match(body.data.images[1], /\.webp$/);
  trackImage(body.data.images[1]);
});
