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

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
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
    fileSize: 30 * 1024 * 1024, // 10MB in bytes
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
