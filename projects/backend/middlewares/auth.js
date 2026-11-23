import User from '../api/users/model.js';
import { fail } from '../helpers/response.js';
import { verifyAccessToken } from '../helpers/token.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, 401, 'UNAUTHORIZED', 'Debes iniciar sesión para continuar');
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash');

    if (!user || !user.isActive || user.deletedAt) {
      return fail(res, 401, 'UNAUTHORIZED', 'Tu usuario no está activo');
    }

    req.user = { id: user._id.toString(), role: user.role, name: user.name };
    return next();
  } catch {
    return fail(res, 401, 'UNAUTHORIZED', 'Tu sesión expiró. Vuelve a iniciar sesión');
  }
}

/**
 * Adjunta req.user cuando hay un token válido, pero permite el acceso anónimo.
 * Se usa en rutas GET públicas para que el admin pueda ver también borradores.
 */
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (user && user.isActive && !user.deletedAt) {
      req.user = { id: user._id.toString(), role: user.role, name: user.name };
    }
  } catch {
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
