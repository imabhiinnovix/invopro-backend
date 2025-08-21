/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
// Accept Excel/CSV + PDF + images
const allowedMimeTypes = [
  // Excel / CSV
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // PDF
  'application/pdf',
  // Images
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  // Fonts
  'font/ttf', // TrueType
  'font/otf', // OpenType
  'font/woff', // Web Open Font Format
  'font/woff2', // Web Open Font Format 2
  'application/vnd.ms-fontobject', // Embedded OpenType (EOT)
];
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB in bytes
  },
});

export const uploadSingleFile = (req: Request, res: Response, next: NextFunction) => {
  const uploadSingle: any = upload.single('file');

  uploadSingle(req, res, (err: any) => {
    if (err) {
      return res.status(400).send({ message: err.message });
    }
    next();
  });
};

export const uploadMultipleFile = (req: Request, res: Response, next: NextFunction) => {
  const uploadMultiple: any = upload.array('files'); // Use array to handle multiple files

  uploadMultiple(req, res, (err: any) => {
    if (err) {
      return res.status(400).send({ message: err.message });
    }
    next();
  });
};
