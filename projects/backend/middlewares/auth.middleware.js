import mongoose from 'mongoose';
import User from '../api/users/model.js';
import { fail } from '../helpers/response.js';
import { verifyAccessToken } from '../helpers/token.js';

/**
 * Extrae el token de `Authorization: Bearer <token>`.
 * Devuelve null si falta el header, el esquema no es Bearer o no hay token.
 */
function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;

  const match = /^Bearer\s+(\S+)\s*$/i.exec(header.trim());
  return match ? match[1] : null;
}

function isAccessTokenPayload(payload) {
  return Boolean(payload && payload.type !== 'refresh' && payload.sub
    && mongoose.isValidObjectId(payload.sub));
}

function attachUser(req, user) {
  req.user = { id: user._id.toString(), role: user.role, name: user.name };
}

export async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return fail(res, 401, 'UNAUTHORIZED', 'Debes iniciar sesión para continuar');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    const message = error.name === 'TokenExpiredError'
      ? 'Tu sesión expiró. Vuelve a iniciar sesión'
      : 'Token de acceso inválido';
    return fail(res, 401, 'UNAUTHORIZED', message);
  }

  if (!isAccessTokenPayload(payload)) {
    return fail(res, 401, 'UNAUTHORIZED', 'Token de acceso inválido');
  }

  let user;
  try {
    user = await User.findById(payload.sub).select('-passwordHash');
  } catch (error) {
    return next(error);
  }

  if (!user || !user.isActive || user.deletedAt) {
    return fail(res, 401, 'UNAUTHORIZED', 'Tu usuario no está activo');
  }

  attachUser(req, user);
  return next();
}

/**
 * Adjunta req.user cuando hay un token válido, pero permite el acceso anónimo.
 * Se usa en rutas GET públicas para que el admin pueda ver también borradores.
 */
export async function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    if (!isAccessTokenPayload(payload)) return next();

    const user = await User.findById(payload.sub).select('-passwordHash');
    if (user && user.isActive && !user.deletedAt) {
      attachUser(req, user);
    }
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      return next(error);
    }
    // En endpoints públicos un token inválido se trata como acceso anónimo.
  }
  return next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'UNAUTHORIZED', 'Debes iniciar sesión para continuar');
    }
    if (!roles.includes(req.user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'No tienes permisos para realizar esta acción');
    }
    return next();
  };
}
