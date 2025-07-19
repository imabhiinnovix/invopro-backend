import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';

import { verifyToken } from '../utils/token.utils';
import { checkPermission } from '../database/services/common/permissionService';

// Declare the augmented module
declare module 'express' {
  interface Request {
    user?: JwtPayload | undefined;
  }
}

export const checkProductPermissionMiddleware = (productKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Example logic: attach productKey to request
      if (!req.user[productKey] || new Date(req.user[productKey]) < new Date()) {
        return res.status(403).json({
          success: false,
          message: `Access denied: Your account does not have an active license for this product. Please contact support.`,
        });
      }

      next();
    } catch (error: any) {
      console.error('Product check error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to check product',
      });
    }
  };
};

export const permissionMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Inside permissionMiddleware ');
      const permissionResp = await checkPermission(req);

      if (permissionResp.isAccess) {
        return next();
      } else {
        return res.status(403).json({
          success: false,
          message: permissionResp.message,
        });
      }
    } catch (error: any) {
      console.error('Permission check error:', error);
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  };
};
