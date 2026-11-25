import bcrypt from 'bcryptjs';
import User from '../users/model.js';
import RefreshToken from './model.js';
import { ok, fail } from '../../helpers/response.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTtlMs
} from '../../helpers/token.js';

// Se compara siempre una contraseña para no revelar si el email existe por timing.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('coro-password-dummy', 10);

const cookieName = () => process.env.COOKIE_NAME || 'refreshToken';
const baseCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/api/auth'
});
const cookieOptions = () => ({ ...baseCookieOptions(), maxAge: getRefreshTtlMs() });

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive
});

const revokeAllSessions = (userId) => RefreshToken.updateMany(
  { userId, revokedAt: null },
  { $set: { revokedAt: new Date() } }
);

export async function register(req, res) {
  const { name, password, role = 'viewer' } = req.body;
  const email = normalizeEmail(req.body.email);

  if (await User.findOne({ email })) {
    return fail(res, 409, 'CONFLICT', 'El email ya está registrado');
  }

  let user;
  try {
    user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'CONFLICT', 'El email ya está registrado', [
        { field: 'email', message: 'El email ya está registrado' }
      ]);
    }
    throw error;
  }

  return ok(res, sanitize(user), 201);
}

export async function login(req, res) {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const user = await User.findOne({ email }).select('+passwordHash');
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash || DUMMY_PASSWORD_HASH);

  if (!user || !user.isActive || user.deletedAt || !passwordMatches) {
    return fail(res, 401, 'UNAUTHORIZED', 'Credenciales inválidas o usuario inactivo');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await RefreshToken.create({
    tokenHash: hashToken(refreshToken),
    userId: user._id,
    expiresAt: new Date(Date.now() + getRefreshTtlMs())
  });

  res.cookie(cookieName(), refreshToken, cookieOptions());
  return ok(res, { accessToken, user: sanitize(user) });
}

export async function refresh(req, res) {
  const token = req.cookies?.[cookieName()];
  if (!token) {
    return fail(res, 401, 'UNAUTHORIZED', 'No hay sesión activa');
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return fail(res, 401, 'UNAUTHORIZED', 'Refresh token inválido');
  }

  if (payload.type !== 'refresh' || !payload.sub) {
    return fail(res, 401, 'UNAUTHORIZED', 'Refresh token inválido');
  }

  const tokenHash = hashToken(token);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored) {
    return fail(res, 401, 'UNAUTHORIZED', 'No hay sesión activa');
  }

  if (stored.revokedAt) {
    await revokeAllSessions(stored.userId);
    res.clearCookie(cookieName(), baseCookieOptions());
    return fail(res, 401, 'UNAUTHORIZED', 'La sesión fue revocada por seguridad. Vuelve a iniciar sesión');
  }

  if (stored.expiresAt < new Date() || stored.userId.toString() !== payload.sub) {
    await revokeAllSessions(stored.userId);
    res.clearCookie(cookieName(), baseCookieOptions());
    return fail(res, 401, 'UNAUTHORIZED', 'La sesión expiró. Vuelve a iniciar sesión');
  }

  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user || !user.isActive || user.deletedAt) {
    await revokeAllSessions(stored.userId);
    res.clearCookie(cookieName(), baseCookieOptions());
    return fail(res, 401, 'UNAUTHORIZED', 'Tu usuario no está activo');
  }

  // Operación atómica: evita que dos peticiones concurrentes roten el mismo token.
  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: stored._id, revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
    { new: true }
  );
  if (!claimed) {
    await revokeAllSessions(stored.userId);
    res.clearCookie(cookieName(), baseCookieOptions());
    return fail(res, 401, 'UNAUTHORIZED', 'La sesión fue revocada por seguridad. Vuelve a iniciar sesión');
  }

  const newRefreshToken = signRefreshToken(user);
  await RefreshToken.create({
    tokenHash: hashToken(newRefreshToken),
    userId: user._id,
    expiresAt: new Date(Date.now() + getRefreshTtlMs())
  });

  res.cookie(cookieName(), newRefreshToken, cookieOptions());
  return ok(res, { accessToken: signAccessToken(user) });
}

export async function logout(req, res) {
  const token = req.cookies?.[cookieName()];
  if (token) {
    await RefreshToken.updateOne(
      { tokenHash: hashToken(token), userId: req.user.id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  res.clearCookie(cookieName(), baseCookieOptions());
  return ok(res, { loggedOut: true });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) return fail(res, 404, 'NOT_FOUND', 'Usuario no encontrado');
  if (!user.isActive || user.deletedAt) {
    return fail(res, 401, 'UNAUTHORIZED', 'Tu usuario no está activo');
  }
  return ok(res, sanitize(user));
}
