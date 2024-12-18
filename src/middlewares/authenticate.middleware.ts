import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';

import { verifyToken } from '../utils/token.utils';

// Declare the augmented module
declare module 'express' {
  interface Request {
    user?: JwtPayload | undefined;
  }
}

// Middleware function to verify JWT token
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the JWT token from the request header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ success: false, message: 'Authentication token is missing' });

    // Verify the token
    const user = await verifyToken(token);

    if (!user || !user.organizationId) return res.status(403).json({ success: false, message: 'Access denied' });

    req.user = user;
    next();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: 'Internal server error',
    });
  }
};
