import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

import Monument from './monument.model.js';
import { ok, fail } from '../../helpers/response.js';

const uploadsRoot = fileURLToPath(new URL('../../uploads/', import.meta.url));
const imagesDir = path.join(uploadsRoot, 'images');

const ALLOWED_IMAGE_EXTENSIONS = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp']
]);

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

class ImageUploadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

function prepareImages(files) {
  if (!files) return [];

  const list = Array.isArray(files) ? files : [files];
  return list.map((file) => {
    const extension = path.extname(file.name || '').toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      throw new ImageUploadError(
        `Extensión no permitida en ${file.name || 'la imagen'}. Usa jpg, jpeg, png o webp`
      );
    }
    if (file.truncated) {
      throw new ImageUploadError(`La imagen ${file.name} supera el tamaño máximo permitido`);
    }

    const expectedMime = ALLOWED_IMAGE_EXTENSIONS.get(extension);
    if (file.mimetype && file.mimetype !== expectedMime) {
      throw new ImageUploadError(`El contenido de ${file.name} no coincide con su extensión`);
    }

    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
    return {
      file,
      destination: path.join(imagesDir, filename),
      url: `/uploads/images/${filename}`
    };
  });
}

async function moveUploadedFile(file, destination) {
  if (!file.tempFilePath) return file.mv(destination);

  try {
    await fs.rename(file.tempFilePath, destination);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fs.copyFile(file.tempFilePath, destination);
    await fs.unlink(file.tempFilePath);
  }
}

async function saveUploadedFiles(prepared) {
  if (!prepared.length) return [];

  await fs.mkdir(imagesDir, { recursive: true });
  const saved = [];

  try {
    for (const item of prepared) {
      await moveUploadedFile(item.file, item.destination);
      saved.push(item.destination);
    }
    return prepared.map((item) => item.url);
  } catch (err) {
    await Promise.allSettled(saved.map((file) => fs.unlink(file).catch(() => {})));
    throw err;
  }
}

async function processImages(req, res) {
  try {
    const prepared = prepareImages(req.files?.images);
    return await saveUploadedFiles(prepared);
  } catch (err) {
    if (!(err instanceof ImageUploadError)) throw err;
    fail(res, 400, 'VALIDATION_ERROR', err.message);
    return null;
  }
}

function removeUploadedFiles(urls) {
  const files = urls.map((url) => path.join(imagesDir, path.basename(url)));
  return Promise.allSettled(files.map((file) => fs.unlink(file).catch(() => {})));
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
  const uploadedUrls = await processImages(req, res);
  if (uploadedUrls === null) return;

  if (uploadedUrls.length) {
    const existing = Array.isArray(data.images) ? data.images : [];
    data.images = [...existing, ...uploadedUrls];
  }
  if (req.user) data.createdBy = req.user.id;

  let monument;
  try {
    monument = await Monument.create(data);
  } catch (err) {
    await removeUploadedFiles(uploadedUrls);
    throw err;
  }
  return ok(res, monument, 201);
}

export async function updateMonument(req, res) {
  const data = pickBody(req.body);
  const uploadedUrls = await processImages(req, res);
  if (uploadedUrls === null) return;

  const update = Object.keys(data).length ? { $set: data } : {};
  if (uploadedUrls.length) {
    if (update.$set) delete update.$set.images;
    update.$push = { images: { $each: uploadedUrls } };
  }

  let monument;
  try {
    monument = await Monument.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      update,
      { new: true, runValidators: true }
    );
  } catch (err) {
    await removeUploadedFiles(uploadedUrls);
    throw err;
  }

  if (!monument) {
    await removeUploadedFiles(uploadedUrls);
    return fail(res, 404, 'NOT_FOUND', 'Monumento no encontrado');
  }
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
