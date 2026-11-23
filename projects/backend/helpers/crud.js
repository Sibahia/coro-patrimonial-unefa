import { ok, fail } from './response.js';

const INTERNAL_FIELDS = ['_id', '__v', 'createdAt', 'updatedAt', 'deletedAt', 'passwordHash'];
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function pickBody(Model, body = {}) {
  const paths = Model.schema.paths;
  const data = {};
  for (const [key, value] of Object.entries(body)) {
    if (INTERNAL_FIELDS.includes(key) || !paths[key]) continue;
    data[key] = value;
  }
  return data;
}

/**
 * Controlador CRUD genérico con borrado lógico, paginación, filtros y
 * publicación opcional de contenido vía Socket.IO.
 */
export function createCrudController(Model, options = {}) {
  const {
    searchFields = [],
    allowedFilters = [],
    tagFilter = false,
    yearFilter = false,
    featuredFilter = false,
    publicFilter = null,
    publishedField = null,
    publishedValue = true,
    populate = [],
    sort = { createdAt: -1 },
    entity = null
  } = options;

  const baseFilter = () => ({ deletedAt: null });

  const emitPublish = (req, doc) => {
    if (!entity || !publishedField || doc[publishedField] !== publishedValue) return;
    req.app.get('io')?.emit('content:published', {
      entity,
      id: doc._id,
      title: doc.title || doc.name || null
    });
  };

  return {
    list: async (req, res) => {
      const filter = baseFilter();

      if (publicFilter && !req.user) Object.assign(filter, publicFilter);
      if (publishedField && !req.user) filter[publishedField] = publishedValue;

      if (req.query.search && searchFields.length) {
        const rx = new RegExp(escapeRegex(req.query.search), 'i');
        filter.$or = searchFields.map((field) => ({ [field]: rx }));
      }
      for (const key of allowedFilters) {
        if (req.query[key] !== undefined && req.query[key] !== '') filter[key] = req.query[key];
      }
      if (tagFilter && req.query.tag) filter.tags = req.query.tag;
      if (yearFilter && req.query.year) filter.year = Number(req.query.year);
      if (featuredFilter && req.query.featured === 'true') filter.isFeatured = true;

      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Model.find(filter).sort(sort).skip(skip).limit(limit).populate(populate),
        Model.countDocuments(filter)
      ]);

      return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
    },

    getById: async (req, res) => {
      const doc = await Model.findOne({ _id: req.params.id, deletedAt: null }).populate(populate);
      if (!doc) return fail(res, 404, 'NOT_FOUND', 'Recurso no encontrado');
      return ok(res, doc);
    },

    create: async (req, res) => {
      const data = pickBody(Model, req.body);
      if (req.user && Model.schema.path('createdBy')) data.createdBy = req.user.id;
      const doc = await Model.create(data);
      emitPublish(req, doc);
      return ok(res, doc, 201);
    },

    update: async (req, res) => {
      const data = pickBody(Model, req.body);
      const doc = await Model.findOneAndUpdate(
        { _id: req.params.id, deletedAt: null },
        data,
        { new: true, runValidators: true }
      ).populate(populate);

      if (!doc) return fail(res, 404, 'NOT_FOUND', 'Recurso no encontrado');
      emitPublish(req, doc);
      return ok(res, doc);
    },

    remove: async (req, res) => {
      const doc = await Model.findOneAndUpdate(
        { _id: req.params.id, deletedAt: null },
        { deletedAt: new Date() },
        { new: true }
      );
      if (!doc) return fail(res, 404, 'NOT_FOUND', 'Recurso no encontrado');
      return ok(res, { id: doc._id, deleted: true });
    }
  };
}
