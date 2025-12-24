/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import * as authService from '../database/services/common/user.service';
import { Role, RoleId } from '../enums/role.enum';

export const roleTypeAuthorization = (allowedRoleIds: RoleId[]) => {
  const allowedRoleNames = allowedRoleIds.map(
    (id) => Role.Labels[id].toLowerCase()
  );

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const user: any = await authService.findUserById(req.user.userId, [
        {
          path: 'roleIds',
          match: { status: 'active' },
        },
      ]);

      if (!user || !Array.isArray(user.roleIds)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const hasAccess = user.roleIds.some((role: any) =>
        role.status === 'active' &&
        (
          role.isSuperUser === true ||
          allowedRoleNames.includes(role.name.toLowerCase())
        )
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to perform this action',
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};