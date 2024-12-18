/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  let status = 500; // Default to internal server error
  if (err.name === 'ValidationError') {
    status = 400; // Bad request for validation errors
  }
  // Send a JSON response with the error message
  res.status(status).json({
    success: false,
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err, // Only include error details in development
  });
};
