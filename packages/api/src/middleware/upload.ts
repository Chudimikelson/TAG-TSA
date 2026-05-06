import multer from 'multer';
import { AppError } from './errorHandler.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Multer middleware configured for in-memory receipt photo uploads.
 * Validates MIME type and size at the boundary.
 */
export const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(415, 'Receipt must be JPEG, PNG, or WebP'));
    }
  },
}).single('receipt');
