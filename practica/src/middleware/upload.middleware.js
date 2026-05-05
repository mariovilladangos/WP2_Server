import multer from 'multer';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { AppError } from '../utils/AppError.js';

/* -- DISK STORAGE --

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `company-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

*/

// Multer en memoria (para procesar con Sharp antes de subir a la nube)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG and WebP images are allowed', 400), false);
  }
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

/**
 * Middleware: procesa el buffer de imagen con Sharp
 * (redimensiona a max 800px, convierte a WebP, comprime).
 */
export const processSignatureImage = async (req, res, next) => {
  if (!req.file) return next();
  try {
    req.file.buffer = await sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    req.file.mimetype = 'image/webp';
    next();
  } catch (err) {
    next(new AppError('Error processing image', 500));
  }
};