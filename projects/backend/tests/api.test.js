import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const uploadsRoot = fileURLToPath(new URL('../uploads/', import.meta.url));
const createdFiles = [];

let mongo;
let server;
let base;
let User;
let adminToken;
let editorToken;
let viewerToken;

function trackUpload(url) {
  const file = path.join(uploadsRoot, url.replace(/^\/uploads\//, ''));
  createdFiles.push(file);
  return file;
}

async function request(route, options = {}) {
  const headers = {};
  const isForm = options.body instanceof FormData;

  if (options.raw !== undefined || (!isForm && options.body !== undefined)) {
    headers['content-type'] = 'application/json';
  }
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.origin) headers.origin = options.origin;

  const body = options.raw !== undefined
    ? options.raw
    : options.body === undefined
      ? undefined
      : isForm ? options.body : JSON.stringify(options.body);

  const response = await fetch(`${base}${route}`, {
    method: options.method || 'GET',
    headers,
    body
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Las respuestas estáticas no son JSON.
  }
  return { response, data };
}

async function login(email, password = 'password123') {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  return result.data.data.accessToken;
}

function form(fields, files = []) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  for (const file of files) {
    data.append(file.field, new Blob([file.content || 'contenido de prueba'], { type: file.mime }), file.name);
  }
  return data;
}

before(async () => {
  process.env.NODE_ENV = 'test';
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_ACCESS_SECRET = 'api-test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'api-test-refresh-secret';
  process.env.PORT = '0';
  process.env.CORS_ORIGINS = 'http://localhost:4200';

  const { default: WebServer } = await import('../bin/server.js');
  const userModel = await import('../api/users/model.js');
  User = userModel.default;

  server = new WebServer();
  const port = await server.listen();
  base = `http://127.0.0.1:${port}`;

  const passwordHash = await bcrypt.hash('password123', 10);
  await User.create([
    { name: 'Admin API', email: 'admin@api.test', passwordHash, role: 'admin' },
    { name: 'Editor API', email: 'editor@api.test', passwordHash, role: 'editor' },
    { name: 'Viewer API', email: 'viewer@api.test', passwordHash, role: 'viewer' }
  ]);

  adminToken = await login('admin@api.test');
  editorToken = await login('editor@api.test');
  viewerToken = await login('viewer@api.test');
});

after(async () => {
  await Promise.allSettled(createdFiles.map((file) => fs.unlink(file).catch(() => {})));
  await mongoose.disconnect().catch(() => {});
  if (server) {
    server.server.closeAllConnections?.();
    await new Promise((resolve) => server.server.close(resolve));
  }
  if (mongo) await mongo.stop();
});

test('health y envelope de errores siguen el contrato', async () => {
  const health = await request('/api/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.data.ok, true);
  assert.equal(health.data.data.status, 'ok');

  const missing = await request('/api/no-existe');
  assert.equal(missing.response.status, 404);
  assert.equal(missing.data.ok, false);
  assert.equal(missing.data.error.code, 'NOT_FOUND');
});

test('CORS solo acepta orígenes de la lista blanca', async () => {
  const allowed = await request('/api/health', { origin: 'http://localhost:4200' });
  assert.equal(allowed.response.headers.get('access-control-allow-origin'), 'http://localhost:4200');

  const denied = await request('/api/health', { origin: 'http://evil.test' });
  assert.equal(denied.response.status, 403);
  assert.equal(denied.data.error.code, 'FORBIDDEN');
});

test('JSON malformado devuelve 400 y no un error interno', async () => {
  const result = await request('/api/works', {
    method: 'POST',
    token: adminToken,
    raw: '{ "title": '
  });
  assert.equal(result.response.status, 400);
  assert.equal(result.data.error.code, 'VALIDATION_ERROR');
});

test('los roles restringen las rutas de administración y edición', async () => {
  const usersAsViewer = await request('/api/users', { token: viewerToken });
  assert.equal(usersAsViewer.response.status, 403);
  assert.equal(usersAsViewer.data.error.code, 'FORBIDDEN');

  const usersAsAdmin = await request('/api/users', { token: adminToken });
  assert.equal(usersAsAdmin.response.status, 200);

  const createAsViewer = await request('/api/works', {
    method: 'POST',
    token: viewerToken,
    body: { title: 'Obra vetada', composer: 'Nadie' }
  });
  assert.equal(createAsViewer.response.status, 403);

  const createAsEditor = await request('/api/works', {
    method: 'POST',
    token: editorToken,
    body: { title: 'Obra del editor', composer: 'Anónimo' }
  });
  assert.equal(createAsEditor.response.status, 201, JSON.stringify(createAsEditor.data));
});

test('users: alta, duplicado, edición y baja lógica', async () => {
  const email = `usuario-${Date.now()}@api.test`;
  const created = await request('/api/users', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Usuario temporal', email, password: 'password123', role: 'editor' }
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.data.email, email);
  assert.ok(!('passwordHash' in created.data.data));
  const id = created.data.data.id;

  const duplicate = await request('/api/users', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Duplicado', email, password: 'password123' }
  });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.data.error.code, 'CONFLICT');

  const updated = await request(`/api/users/${id}`, {
    method: 'PUT',
    token: adminToken,
    body: { name: 'Usuario editado', role: 'viewer' }
  });
  assert.equal(updated.response.status, 200, JSON.stringify(updated.data));
  assert.equal(updated.data.data.role, 'viewer');

  const removed = await request(`/api/users/${id}`, { method: 'DELETE', token: adminToken });
  assert.equal(removed.response.status, 200);
  assert.equal(removed.data.data.disabled, true);

  const loginRemoved = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'password123' }
  });
  assert.equal(loginRemoved.response.status, 401);

  const invalidId = await request('/api/users/no-es-un-id', { token: adminToken });
  assert.equal(invalidId.response.status, 400);
  assert.equal(invalidId.data.error.code, 'VALIDATION_ERROR');
});

test('members: validación, baja lógica y filtro público no eludible', async () => {
  const email = `corista-${Date.now()}@api.test`;
  const invalid = await request('/api/members', {
    method: 'POST',
    token: editorToken,
    body: { firstName: 'Voz', lastName: 'Inválida', voiceType: 'contrabajo' }
  });
  assert.equal(invalid.response.status, 400);

  const created = await request('/api/members', {
    method: 'POST',
    token: editorToken,
    body: {
      firstName: 'Coro', lastName: 'API', voiceType: 'soprano',
      role: 'Corista', email
    }
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  const id = created.data.data._id;

  let publicList = await request('/api/members?search=Coro');
  assert.equal(publicList.response.status, 200);
  assert.ok(publicList.data.data.items.some((item) => item._id === id));

  const deactivated = await request(`/api/members/${id}`, {
    method: 'PUT',
    token: editorToken,
    body: {
      firstName: 'Coro',
      lastName: 'API',
      isActive: false,
      leftAt: new Date().toISOString()
    }
  });
  assert.equal(deactivated.response.status, 200, JSON.stringify(deactivated.data));
  assert.equal(deactivated.data.data.isActive, false);

  publicList = await request('/api/members?search=Coro');
  assert.ok(!publicList.data.data.items.some((item) => item._id === id));

  const bypass = await request('/api/members?search=Coro&isActive=false');
  assert.ok(!bypass.data.data.items.some((item) => item._id === id));

  const adminList = await request('/api/members?search=Coro', { token: adminToken });
  assert.ok(adminList.data.data.items.some((item) => item._id === id));
});

test('works: paginación, filtros y borrado lógico', async () => {
  const stamp = Date.now();
  for (const suffix of ['Uno', 'Dos', 'Tres']) {
    const created = await request('/api/works', {
      method: 'POST',
      token: editorToken,
      body: {
        title: `Pagina${stamp}${suffix}`,
        composer: 'Compositor de prueba',
        category: 'sacred',
        tags: ['liturgia'],
        isPublished: true
      }
    });
    assert.equal(created.response.status, 201, JSON.stringify(created.data));
  }

  const page = await request(`/api/works?search=Pagina${stamp}&limit=2&page=2`);
  assert.equal(page.response.status, 200);
  assert.equal(page.data.data.total, 3);
  assert.equal(page.data.data.pages, 2);
  assert.equal(page.data.data.items.length, 1);

  const filtered = await request('/api/works?category=sacred&tag=liturgia');
  assert.ok(filtered.data.data.items.some((item) => item.title.startsWith(`Pagina${stamp}`)));

  const workId = page.data.data.items[0]._id;
  const removed = await request(`/api/works/${workId}`, { method: 'DELETE', token: editorToken });
  assert.equal(removed.response.status, 200);
  assert.equal(removed.data.data.deleted, true);

  const detail = await request(`/api/works/${workId}`);
  assert.equal(detail.response.status, 404);
});

test('events: ciclo draft → published → finished y visibilidad pública', async () => {
  const work = await request('/api/works', {
    method: 'POST',
    token: adminToken,
    body: { title: `Obra evento ${Date.now()}`, composer: 'Anónimo', isPublished: true }
  });
  const member = await request('/api/members', {
    method: 'POST',
    token: adminToken,
    body: { firstName: 'Evento', lastName: 'Miembro' }
  });

  const eventBody = {
    title: `Concierto ${Date.now()}`,
    startAt: new Date(Date.now() + 86400000).toISOString(),
    venue: { name: 'Auditorio UNEFA', city: 'Caracas' },
    type: 'concert',
    status: 'draft',
    workIds: [work.data.data._id],
    memberIds: [member.data.data._id]
  };
  const draft = await request('/api/events', {
    method: 'POST',
    token: editorToken,
    body: eventBody
  });
  assert.equal(draft.response.status, 201, JSON.stringify(draft.data));
  assert.equal(draft.data.data.workIds[0], work.data.data._id);
  const id = draft.data.data._id;

  const publicBefore = await request(`/api/events/${id}`);
  assert.equal(publicBefore.response.status, 404);

  const adminBefore = await request(`/api/events/${id}`, { token: adminToken });
  assert.equal(adminBefore.response.status, 200);
  assert.equal(adminBefore.data.data.workIds[0].title, work.data.data.title);
  assert.equal(adminBefore.data.data.memberIds[0].firstName, 'Evento');

  const published = await request(`/api/events/${id}`, {
    method: 'PUT',
    token: adminToken,
    body: { ...eventBody, status: 'published' }
  });
  assert.equal(published.response.status, 200, JSON.stringify(published.data));

  const publicDetail = await request(`/api/events/${id}`);
  assert.equal(publicDetail.data.data.status, 'published');

  const finished = await request(`/api/events/${id}`, {
    method: 'PUT',
    token: editorToken,
    body: { ...eventBody, status: 'finished' }
  });
  assert.equal(finished.response.status, 200);
  assert.equal(finished.data.data.status, 'finished');

  const publicAfterFinish = await request(`/api/events/${id}`);
  assert.equal(publicAfterFinish.response.status, 404);

  const invalid = await request('/api/events', {
    method: 'POST',
    token: editorToken,
    body: { title: 'Sin fecha', status: 'published' }
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.data.error.code, 'VALIDATION_ERROR');
});

test('heritage: publicación, filtros y validación de tipo', async () => {
  const stamp = Date.now();
  const created = await request('/api/heritage', {
    method: 'POST',
    token: editorToken,
    body: {
      title: `Archivo ${stamp}`,
      type: 'photo',
      year: 1998,
      tags: ['historia'],
      isPublished: true,
      isFeatured: true
    }
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  const id = created.data.data._id;

  const hidden = await request('/api/heritage', {
    method: 'POST',
    token: editorToken,
    body: { title: `Borrador ${stamp}`, type: 'document', isPublished: false }
  });
  assert.equal(hidden.response.status, 201);

  const filtered = await request('/api/heritage?type=photo&tag=historia&year=1998&featured=true');
  assert.ok(filtered.data.data.items.some((item) => item._id === id));
  assert.ok(filtered.data.data.items.every((item) => item.type === 'photo' && item.isPublished === true));

  const invalid = await request('/api/heritage', {
    method: 'POST',
    token: editorToken,
    body: { title: 'Sin tipo' }
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.data.error.code, 'VALIDATION_ERROR');
});

test('monuments: validaciones y borrado lógico', async () => {
  const code = `MON-API-${Date.now()}`;
  const invalid = await request('/api/monuments', {
    method: 'POST',
    token: editorToken,
    body: { title: 'Inválido', code, category: 'Desconocida', constructionType: 'Tapia' }
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.data.error.code, 'VALIDATION_ERROR');

  const created = await request('/api/monuments', {
    method: 'POST',
    token: editorToken,
    body: {
      title: 'Monumento API',
      code,
      category: 'Civil',
      constructionType: 'Mampostería',
      location: { lat: 10.5, lng: -66.9, address: 'Caracas' }
    }
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  const id = created.data.data._id;

  const removed = await request(`/api/monuments/${id}`, { method: 'DELETE', token: editorToken });
  assert.equal(removed.response.status, 200);
  const detail = await request(`/api/monuments/${id}`);
  assert.equal(detail.response.status, 404);
  assert.equal(detail.data.error.code, 'NOT_FOUND');
});

test('monuments: varias imágenes válidas se conservan en orden', async () => {
  const created = await request('/api/monuments', {
    method: 'POST',
    token: adminToken,
    body: form(
      {
        title: 'Monumento multiimagen',
        code: `MON-MULTI-${Date.now()}`,
        category: 'Plaza',
        constructionType: 'Bahareque'
      },
      [
        { field: 'images', name: 'uno.png', mime: 'image/png' },
        { field: 'images', name: 'dos.jpg', mime: 'image/jpeg' }
      ]
    )
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.data.images.length, 2);
  for (const url of created.data.data.images) {
    assert.match(url, /^\/uploads\/images\/\d+-[0-9a-f]{12}\.(png|jpg)$/);
    await assert.doesNotReject(() => fs.access(trackUpload(url)));
  }
});

test('uploads: subida válida, entrega estática y rechazos', async () => {
  const valid = await request('/api/uploads', {
    method: 'POST',
    token: editorToken,
    body: form({ folder: 'images' }, [{ field: 'file', name: 'asset.png', mime: 'image/png', content: 'contenido asset' }])
  });
  assert.equal(valid.response.status, 201, JSON.stringify(valid.data));
  assert.equal(valid.data.data.folder, 'images');
  assert.ok(valid.data.data.ownerId);
  const url = valid.data.data.url;
  trackUpload(url);

  const served = await fetch(`${base}${url}`);
  assert.equal(served.status, 200);
  assert.equal(await served.text(), 'contenido asset');

  const badFolder = await request('/api/uploads', {
    method: 'POST',
    token: editorToken,
    body: form({ folder: 'scripts' }, [{ field: 'file', name: 'x.png', mime: 'image/png' }])
  });
  assert.equal(badFolder.response.status, 400);

  const badMime = await request('/api/uploads', {
    method: 'POST',
    token: editorToken,
    body: form({ folder: 'images' }, [{ field: 'file', name: 'x.txt', mime: 'text/plain' }])
  });
  assert.equal(badMime.response.status, 400);

  const noFile = await request('/api/uploads', {
    method: 'POST',
    token: editorToken,
    body: form({ folder: 'images' })
  });
  assert.equal(noFile.response.status, 400);

  const forbidden = await request('/api/uploads', {
    method: 'POST',
    token: viewerToken,
    body: form({ folder: 'images' }, [{ field: 'file', name: 'x.png', mime: 'image/png' }])
  });
  assert.equal(forbidden.response.status, 403);
});

test('socket: publicar contenido emite content:published', async () => {
  const realIo = server.app.get('io');
  const emitted = [];
  server.app.set('io', { emit: (event, payload) => emitted.push({ event, payload }) });

  try {
    const work = await request('/api/works', {
      method: 'POST',
      token: adminToken,
      body: { title: `Socket work ${Date.now()}`, composer: 'Anónimo', isPublished: true }
    });
    const event = await request('/api/events', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Socket event ${Date.now()}`,
        startAt: new Date().toISOString(),
        status: 'published'
      }
    });
    const heritage = await request('/api/heritage', {
      method: 'POST',
      token: adminToken,
      body: { title: `Socket heritage ${Date.now()}`, type: 'photo', isPublished: true }
    });

    assert.equal(work.response.status, 201, JSON.stringify(work.data));
    assert.equal(event.response.status, 201, JSON.stringify(event.data));
    assert.equal(heritage.response.status, 201, JSON.stringify(heritage.data));
  } finally {
    server.app.set('io', realIo);
  }

  assert.deepEqual(
    emitted.map((item) => item.payload.entity).sort(),
    ['Event', 'HeritageItem', 'Work']
  );
  assert.ok(emitted.every((item) => item.event === 'content:published' && item.payload.id && item.payload.title));
});
