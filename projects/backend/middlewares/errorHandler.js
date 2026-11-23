import { fail } from '../helpers/response.js';

export function notFound(req, res) {
  return fail(res, 404, 'NOT_FOUND', `Ruta ${req.method} ${req.originalUrl} no encontrada`);
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[error]', err);

  if (err.message === 'Not allowed by CORS') {
    return fail(res, 403, 'FORBIDDEN', 'Origen no permitido por CORS');
  }
  if (err.name === 'CastError') {
    return fail(res, 400, 'VALIDATION_ERROR', `Valor inválido para ${err.path}`);
  }
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
    return fail(res, 400, 'VALIDATION_ERROR', 'No se pudo guardar el registro', details);
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'valor';
    return fail(res, 409, 'CONFLICT', `El ${field} ya está registrado`);
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return fail(res, 401, 'UNAUTHORIZED', 'Token inválido o expirado');
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return fail(res, 400, 'VALIDATION_ERROR', 'El archivo supera el tamaño máximo permitido');
  }

  const message = process.env.NODE_ENV === 'production'
    ? 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.'
    : err.message;

  return fail(res, 500, 'SERVER_ERROR', message);
}
