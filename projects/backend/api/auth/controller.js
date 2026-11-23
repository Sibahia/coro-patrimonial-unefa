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

const cookieName = () => process.env.COOKIE_NAME || 'refreshToken';
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/api/auth',
  maxAge: getRefreshTtlMs()
});

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive
});

export async function register(req, res) {
  const { name, email, password, role = 'viewer' } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  if (await User.findOne({ email: normalizedEmail })) {
    return fail(res, 409, 'CONFLICT', 'El email ya está registrado');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: normalizedEmail, passwordHash, role });
  return ok(res, sanitize(user), 201);
}

export async function login(req, res) {
  const email = req.body.email.trim().toLowerCase();
  const user = await User.findOne({ email }).select('+passwordHash');

  const valid = user && user.isActive && !user.deletedAt
    && await bcrypt.compare(req.body.password, user.passwordHash);

  if (!valid) {
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

  const tokenHash = hashToken(token);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return fail(res, 401, 'UNAUTHORIZED', 'La sesión expiró. Vuelve a iniciar sesión');
  }

  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user || !user.isActive || user.deletedAt) {
    return fail(res, 401, 'UNAUTHORIZED', 'Tu usuario no está activo');
  }

  stored.revokedAt = new Date();
  await stored.save();

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
      { tokenHash: hashToken(token), revokedAt: null },
      { revokedAt: new Date() }
    );
  }

  res.clearCookie(cookieName(), { path: '/api/auth' });
  return ok(res, { loggedOut: true });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id).select('-passwordHash');
  if (!user) return fail(res, 404, 'NOT_FOUND', 'Usuario no encontrado');
  return ok(res, sanitize(user));
}
