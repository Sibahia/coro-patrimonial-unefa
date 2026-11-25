import crypto from 'crypto';
import jwt from 'jsonwebtoken';

function resolveSecret(name, developmentValue) {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`La variable ${name} es obligatoria en producción`);
  }
  return developmentValue;
}

const accessSecret = () => resolveSecret('JWT_ACCESS_SECRET', 'dev-access-secret-change-me');
const refreshSecret = () => resolveSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me');

/**
 * Falla temprano si en producción no están configurados los secretos.
 * Se llama al construir el servidor, no durante la primera petición.
 */
export function assertJwtConfig() {
  accessSecret();
  refreshSecret();
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      name: user.name,
      type: 'access'
    },
    accessSecret(),
    { expiresIn: process.env.JWT_ACCESS_TTL || '15m' }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), type: 'refresh', jti: crypto.randomUUID() },
    refreshSecret(),
    { expiresIn: process.env.JWT_REFRESH_TTL || '7d' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret());
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret());
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshTtlMs() {
  const value = process.env.JWT_REFRESH_TTL || '7d';
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const factor = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return amount * factor;
}
