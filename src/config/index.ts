import * as dotenv from 'dotenv';

dotenv.config(); // loads environment variables from .env file

const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,

  MONGO_URI: process.env.MONGO_URI,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN as string,

  CONVERT_API_SECRET_KEY: process.env.CONVERT_API_SECRET_KEY as string,

  EMAIL_HOST: process.env.EMAIL_HOST as string,
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT as string, 10) || 587,
  EMAIL_USER: process.env.EMAIL_USER as string,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD as string,

  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL as string,

  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS as string,

  PDFTRON_KEY: process.env.SENDGRID_API_KEY as string,

  GEMINI_API_KEY: process.env.GEMINI_API_KEY as string,

  OTP_TIME_LIMIT: parseInt(process.env.OTP_TIME_LIMIT as string, 10) || 15,
  OTP_LIMIT: parseInt(process.env.OTP_LIMIT as string, 10) || 5,
  OTP_EXPIRATION_TIME: parseInt(process.env.OTP_EXPIRATION_TIME as string, 10) || 5,

  CHART_TYPE_ENUM: [
    'line',
    'pie',
    'area',
    'number',
    'horizontalBar',
    'verticalBar',
    'stackedBar',
    'bubble',
    'doughnut',
    'multiSeriesPie',
    'polarArea',
    'radar',
    'scatter',
    'tabular',
  ],
  FIELD_TYPE_ENUM: ['number', 'text', 'date', 'boolean', 'richtext', 'url', 'option', 'multioption', 'user', 'email'],
  BASE_API_ROUTE: process.env.BASE_API_ROUTE || '',
};

export default ENV;
