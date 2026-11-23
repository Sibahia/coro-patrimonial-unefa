import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import Asset from './model.js';
import { ok, fail } from '../../helpers/response.js';

const uploadsRoot = fileURLToPath(new URL('../../uploads/', import.meta.url));

const ALLOWED = {
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  audios: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg'],
  apks: ['application/vnd.android.package-archive']
};

export async function upload(req, res) {
  const folder = req.body?.folder || 'images';
  if (!ALLOWED[folder]) {
    return fail(res, 400, 'VALIDATION_ERROR', `Carpeta no permitida: ${folder}`);
  }

  const file = req.files?.file;
  if (!file) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Debes enviar un archivo en el campo "file"');
  }
  if (!ALLOWED[folder].includes(file.mimetype)) {
    return fail(res, 400, 'VALIDATION_ERROR', `Tipo de archivo no permitido en ${folder}`);
  }

  const extension = path.extname(file.name).toLowerCase() || '.bin';
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
  const destination = path.join(uploadsRoot, folder, filename);

  await fs.mkdir(path.dirname(destination), { recursive: true });
  if (file.tempFilePath) {
    await fs.rename(file.tempFilePath, destination);
  } else {
    await file.mv(destination);
  }

  const url = `/uploads/${folder}/${filename}`;
  const asset = await Asset.create({
    originalName: file.name,
    url,
    mimeType: file.mimetype,
    size: file.size,
    folder,
    ownerId: req.user.id
  });

  return ok(res, asset, 201);
}
