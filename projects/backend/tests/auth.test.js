import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo;
let server;
let base;
let User;
let admin;
let adminToken;
let viewerToken;

const adminEmail = 'admin@auth.test';
const viewerEmail = 'viewer@auth.test';
const inactiveEmail = 'inactivo@auth.test';
const password = 'password123';

function cookieFrom(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0];
}

async function request(path, options = {}) {
  const headers = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.authorization) headers.authorization = options.authorization;
  if (options.cookie) headers.cookie = options.cookie;

  const response = await fetch(`${base}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Algunas respuestas (estáticos) no son JSON.
  }
  return { response, data };
}

async function loginUser(email, passwordToUse = password) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password: passwordToUse }
  });
  return { ...result, cookie: cookieFrom(result.response) };
}

before(async () => {
  process.env.NODE_ENV = 'test';
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_ACCESS_SECRET = 'auth-test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'auth-test-refresh-secret';
  process.env.PORT = '0';
  process.env.CORS_ORIGINS = 'http://localhost:4200';

  const { default: WebServer } = await import('../bin/server.js');
  const userModel = await import('../api/users/model.js');
  User = userModel.default;

  server = new WebServer();
  const port = await server.listen();
  base = `http://127.0.0.1:${port}`;

  const passwordHash = await bcrypt.hash(password, 10);
  admin = await User.create({
    name: 'Admin Auth', email: adminEmail, passwordHash, role: 'admin'
  });
  await User.create({
    name: 'Viewer Auth', email: viewerEmail, passwordHash, role: 'viewer'
  });
  await User.create({
    name: 'Inactivo', email: inactiveEmail, passwordHash, role: 'viewer', isActive: false
  });

  const adminLogin = await loginUser(adminEmail);
  assert.equal(adminLogin.response.status, 200, JSON.stringify(adminLogin.data));
  adminToken = adminLogin.data.data.accessToken;

  const viewerLogin = await loginUser(viewerEmail);
  assert.equal(viewerLogin.response.status, 200, JSON.stringify(viewerLogin.data));
  viewerToken = viewerLogin.data.data.accessToken;
});

after(async () => {
  await mongoose.disconnect().catch(() => {});
  if (server) {
    server.server.closeAllConnections?.();
    await new Promise((resolve) => server.server.close(resolve));
  }
  if (mongo) await mongo.stop();
});

test('registro exige rol admin y valida los datos', async () => {
  let result = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Sin token', email: 'sin-token@auth.test', password }
  });
  assert.equal(result.response.status, 401);
  assert.equal(result.data.error.code, 'UNAUTHORIZED');

  result = await request('/api/auth/register', {
    method: 'POST',
    token: viewerToken,
    body: { name: 'Sin permiso', email: 'sin-permiso@auth.test', password }
  });
  assert.equal(result.response.status, 403);
  assert.equal(result.data.error.code, 'FORBIDDEN');

  result = await request('/api/auth/register', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Rol inválido', email: 'rol-invalido@auth.test', password, role: 'super' }
  });
  assert.equal(result.response.status, 400);
  assert.equal(result.data.error.code, 'VALIDATION_ERROR');

  result = await request('/api/auth/register', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Nuevo', email: 'NUEVO@AUTH.TEST', password }
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.data));
  assert.equal(result.data.data.email, 'nuevo@auth.test');
  assert.equal(result.data.data.role, 'viewer');
  assert.ok(!('passwordHash' in result.data.data));

  result = await request('/api/auth/register', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Duplicado', email: 'nuevo@auth.test', password }
  });
  assert.equal(result.response.status, 409);
  assert.equal(result.data.error.code, 'CONFLICT');
});

test('login rechaza credenciales inválidas y usuarios inactivos', async () => {
  let result = await loginUser(adminEmail, 'contraseña-incorrecta');
  assert.equal(result.response.status, 401);
  assert.equal(result.data.error.code, 'UNAUTHORIZED');

  result = await loginUser(inactiveEmail);
  assert.equal(result.response.status, 401);

  result = await loginUser(adminEmail);
  assert.equal(result.response.status, 200);
  assert.equal(typeof result.data.data.accessToken, 'string');
  assert.equal(result.data.data.user.email, adminEmail);
  assert.match(cookieFrom(result.response), /^refreshToken=/);
  assert.match(result.response.headers.get('set-cookie') || '', /HttpOnly/i);
});

test('me valida el token y distingue errores de acceso', async () => {
  let result = await request('/api/auth/me');
  assert.equal(result.response.status, 401);

  result = await request('/api/auth/me', { authorization: 'Token abc' });
  assert.equal(result.response.status, 401);
  assert.equal(result.data.error.code, 'UNAUTHORIZED');

  result = await request('/api/auth/me', { authorization: 'Bearer ' });
  assert.equal(result.response.status, 401);

  const expired = jwt.sign(
    { sub: admin._id.toString(), type: 'access' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '-10s' }
  );
  result = await request('/api/auth/me', { authorization: `Bearer ${expired}` });
  assert.equal(result.response.status, 401);
  assert.match(result.data.error.message, /sesión expiró/i);

  const refreshAsAccess = jwt.sign(
    { sub: admin._id.toString(), type: 'refresh' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '5m' }
  );
  result = await request('/api/auth/me', { authorization: `Bearer ${refreshAsAccess}` });
  assert.equal(result.response.status, 401);

  result = await request('/api/auth/me', { token: adminToken });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.data.email, adminEmail);
  assert.ok(!('passwordHash' in result.data.data));
});

test('ruta pública con token inválido continúa como anónima', async () => {
  const result = await request('/api/works', { authorization: 'Bearer token.invalido' });
  assert.equal(result.response.status, 200);
  assert.equal(result.data.ok, true);
});

test('refresh rota tokens y revoca las sesiones si se reutiliza el anterior', async () => {
  const first = await loginUser(adminEmail);
  assert.equal(first.response.status, 200);

  let result = await request('/api/auth/refresh', { method: 'POST', cookie: first.cookie });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  const secondCookie = cookieFrom(result.response);
  assert.notEqual(secondCookie, first.cookie);
  assert.equal(typeof result.data.data.accessToken, 'string');

  result = await request('/api/auth/refresh', { method: 'POST', cookie: secondCookie });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  const thirdCookie = cookieFrom(result.response);

  result = await request('/api/auth/refresh', { method: 'POST', cookie: first.cookie });
  assert.equal(result.response.status, 401);
  assert.equal(result.data.error.code, 'UNAUTHORIZED');
  assert.match(result.data.error.message, /revocada por seguridad/i);

  result = await request('/api/auth/refresh', { method: 'POST', cookie: thirdCookie });
  assert.equal(result.response.status, 401);
});

test('logout exige autenticación y revoca la sesión actual', async () => {
  let result = await request('/api/auth/logout', { method: 'POST' });
  assert.equal(result.response.status, 401);

  const login = await loginUser(viewerEmail);
  assert.equal(login.response.status, 200, JSON.stringify(login.data));
  const token = login.data.data.accessToken;

  result = await request('/api/auth/logout', {
    method: 'POST',
    token,
    cookie: login.cookie
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  assert.match(result.response.headers.get('set-cookie') || '', /refreshToken=/);

  result = await request('/api/auth/refresh', { method: 'POST', cookie: login.cookie });
  assert.equal(result.response.status, 401);
});

