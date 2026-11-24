import Monument from './monument.model.js';
import { ok, fail } from '../../helpers/response.js';

const ALLOWED_FIELDS = [
  'title',
  'code',
  'category',
  'period',
  'constructionType',
  'location',
  'history',
  'images',
  'audioGuideUrl',
  'status'
];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function pickBody(body = {}) {
  const data = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
}

export async function getMonuments(req, res) {
  const filter = { deletedAt: null };

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [
      { title: rx },
      { code: rx },
      { history: rx },
      { period: rx },
      { 'location.address': rx }
    ];
  }

  for (const key of ['category', 'constructionType', 'status', 'period']) {
    if (req.query[key] !== undefined && req.query[key] !== '') {
      filter[key] = req.query[key];
    }
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Monument.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Monument.countDocuments(filter)
  ]);

  return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function getMonumentById(req, res) {
  const monument = await Monument.findOne({ _id: req.params.id, deletedAt: null });
  if (!monument) return fail(res, 404, 'NOT_FOUND', 'Monumento no encontrado');
  return ok(res, monument);
}

export async function createMonument(req, res) {
  const data = pickBody(req.body);
  if (req.user) data.createdBy = req.user.id;

  const monument = await Monument.create(data);
  return ok(res, monument, 201);
}

export async function updateMonument(req, res) {
  const data = pickBody(req.body);

  const monument = await Monument.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    data,
    { new: true, runValidators: true }
  );

  if (!monument) return fail(res, 404, 'NOT_FOUND', 'Monumento no encontrado');
  return ok(res, monument);
}

export async function deleteMonument(req, res) {
  const monument = await Monument.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );

  if (!monument) return fail(res, 404, 'NOT_FOUND', 'Monumento no encontrado');
  return ok(res, { id: monument._id, deleted: true });
}
