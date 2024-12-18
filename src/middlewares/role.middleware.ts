import { Request, Response, NextFunction } from 'express';

export const roleAuthorization = (roles: Array<number>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.roleId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    next();
  };
};
