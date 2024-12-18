import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';

import routes from './api/routes';
import { errorHandler } from './middlewares/error.middleware';
import config from './config';

const matchOrigin = (origin: string, allowedOrigin: string): boolean => {
  if (allowedOrigin.includes('*')) {
    const regex = new RegExp(`^${allowedOrigin.replace(/\*/g, '.*')}$`);
    return regex.test(origin);
  }
  return origin === allowedOrigin;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (config.ALLOWED_ORIGINS === '*') {
      // Allow all origins if `ALLOWED_ORIGINS` is set to `*`
      callback(null, true);
    } else if (!origin) {
      // Allow requests with no origin (like mobile apps or server-to-server requests)
      callback(null, true);
    } else {
      // Split allowed origins from the .env file and check against each
      const allowedOrigins = config.ALLOWED_ORIGINS.split(',');
      if (allowedOrigins.some((allowed) => matchOrigin(origin, allowed))) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

const configureExpress = async (app: Express) => {
  app.use(morgan('dev'));
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static('uploads'));
  app.use('/api/v1', routes);
  app.use(errorHandler);
};

export default configureExpress;
