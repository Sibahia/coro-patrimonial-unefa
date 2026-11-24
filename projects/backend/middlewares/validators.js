import { body, param, validationResult } from 'express-validator';
import { fail } from '../helpers/response.js';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map((e) => ({
    field: e.path || e.param,
    message: e.msg
  }));
  return fail(res, 400, 'VALIDATION_ERROR', 'Revisa los datos enviados', details);
}

export const idRule = [param('id').isMongoId().withMessage('ID inválido')];

export const registerRules = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('email').trim().isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('role').optional().isIn(['admin', 'editor', 'viewer']).withMessage('Rol inválido')
];

export const loginRules = [
  body('email').trim().isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria')
];

export const memberRules = [
  body('firstName').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('lastName').trim().notEmpty().withMessage('El apellido es obligatorio'),
  body('voiceType').optional().isIn(['soprano', 'contralto', 'tenor', 'bass']).withMessage('Voz inválida'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Email inválido'),
  body('joinedAt').optional({ nullable: true }).isISO8601().withMessage('Fecha inválida'),
  body('leftAt').optional({ nullable: true }).isISO8601().withMessage('Fecha inválida')
];

export const workRules = [
  body('title').trim().notEmpty().withMessage('El título es obligatorio'),
  body('composer').trim().notEmpty().withMessage('El compositor es obligatorio'),
  body('category').optional().isIn(['sacred', 'secular', 'popular', 'patriotic']).withMessage('Categoría inválida'),
  body('durationSeconds').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Duración inválida'),
  body('tags').optional().isArray().withMessage('Tags debe ser una lista')
];

export const eventRules = [
  body('title').trim().notEmpty().withMessage('El título es obligatorio'),
  body('startAt').isISO8601().withMessage('Fecha de inicio inválida'),
  body('endAt').optional({ nullable: true }).isISO8601().withMessage('Fecha de fin inválida'),
  body('type').optional().isIn(['concert', 'rehearsal', 'recording', 'activity']).withMessage('Tipo inválido'),
  body('status').optional().isIn(['draft', 'published', 'finished']).withMessage('Estado inválido'),
  body('venue.name').optional().trim().notEmpty().withMessage('El lugar es obligatorio'),
  body('workIds').optional().isArray().withMessage('workIds debe ser una lista'),
  body('memberIds').optional().isArray().withMessage('memberIds debe ser una lista')
];

export const heritageRules = [
  body('title').trim().notEmpty().withMessage('El título es obligatorio'),
  body('type').optional().isIn(['photo', 'document', 'audio', 'video', 'object']).withMessage('Tipo inválido'),
  body('year').optional({ nullable: true }).isInt().withMessage('Año inválido'),
  body('tags').optional().isArray().withMessage('Tags debe ser una lista')
];

export const monumentRules = [
  body('title').trim().notEmpty().withMessage('El título es obligatorio'),
  body('code').trim().notEmpty().withMessage('El código es obligatorio'),
  body('category').isIn(['Religioso', 'Civil', 'Militar', 'Plaza', 'Museo']).withMessage('Categoría inválida'),
  body('period').optional({ nullable: true }).isString().trim(),
  body('constructionType').isIn(['Tapia', 'Adobe', 'Bahareque', 'Mampostería']).withMessage('Tipo de construcción inválido'),
  body('location.lat').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
  body('location.lng').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
  body('location.address').optional({ nullable: true }).isString().trim(),
  body('history').optional({ nullable: true }).isString(),
  body('images').optional().isArray().withMessage('Las imágenes deben ser una lista'),
  body('images.*').optional().isString().withMessage('Cada imagen debe ser una ruta de texto'),
  body('audioGuideUrl').optional({ nullable: true }).isString().trim(),
  body('status').optional().isIn(['Excelente', 'Regular', 'Deteriorado', 'Critico']).withMessage('Estado inválido')
];
