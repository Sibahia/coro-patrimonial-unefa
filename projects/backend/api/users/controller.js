import bcrypt from 'bcryptjs';
import User from './model.js';
import { ok, fail } from '../../helpers/response.js';

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt
});

export async function list(req, res) {
  const filter = { deletedAt: null };
  if (req.query.search) {
    const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (req.query.role) filter.role = req.query.role;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter)
  ]);

  return ok(res, {
    items: items.map(sanitize),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  });
}

export async function getById(req, res) {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) return fail(res, 404, 'NOT_FOUND', 'Usuario no encontrado');
  return ok(res, sanitize(user));
}

export async function create(req, res) {
  const { name, email, password, role = 'viewer' } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  if (await User.findOne({ email: normalizedEmail })) {
    return fail(res, 409, 'CONFLICT', 'El email ya está registrado');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: normalizedEmail, passwordHash, role });
  return ok(res, sanitize(user), 201);
}

export async function update(req, res) {
  const data = {};
  for (const key of ['name', 'email', 'role', 'isActive']) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  if (req.body.password) {
    data.passwordHash = await bcrypt.hash(req.body.password, 12);
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    data,
    { new: true, runValidators: true }
  );
  if (!user) return fail(res, 404, 'NOT_FOUND', 'Usuario no encontrado');
  return ok(res, sanitize(user));
}

export async function remove(req, res) {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { isActive: false },
    { new: true }
  );
  if (!user) return fail(res, 404, 'NOT_FOUND', 'Usuario no encontrado');
  return ok(res, { id: user._id, disabled: true });
}
