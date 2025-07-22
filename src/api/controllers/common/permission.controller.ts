import { Request, Response, NextFunction } from 'express';
import * as permissionService from '../../../database/services/common/permission.service';
import { Types } from 'mongoose';
const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const VALID_STATUS = ['active', 'inactive'];
const VALID_RESOURCE_TYPES = ['Data Source'];
export const getPermissionList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search }: any = req.query;
    const { isSuperUser, organizationId } = req.user;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const query: any = {
      status: 'active',
      $or: [{ organizationId: { $exists: false } }, { organizationId: new Types.ObjectId(organizationId) }],
    };
    if (search) query.name = { $regex: search, $options: 'i' };

    if (!isSuperUser) {
      query['isSuperUser'] = false;
    }

    const { data, totalCount } = await permissionService.getPermissionList({ query, page, limit });

    res.status(200).json({
      success: true,
      message: 'Permission list fetched successfully.',
      data,
      totalCount,
    });
  } catch (err) {
    next(err);
  }
};

export const createPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, method, dataSourceId, status = 'active' } = req.body;
    const { organizationId } = req.user;
    let resourceId = '';
    let actualMethod = '';
    if (method.toLowerCase() === 'get') {
      resourceId = 'common/dataSource/dataSourceId/:dataSourceId';
      actualMethod = 'GET';
    } else if (method.toLowerCase() === 'update') {
      resourceId = '/common/dataSource/update/:dataSourceId';
      actualMethod = 'PUT';
    } else {
      res.status(400).json({ success: false, message: 'Invalid Method' });
    }
    const permission = await permissionService.createPermission({
      name,
      method: actualMethod,
      resourceId,
      resourceType: 'Data Source',
      dataSourceId: new Types.ObjectId(dataSourceId),
      status,
      organizationId,
    });
    res.status(201).json({ success: true, data: permission });
  } catch (err) {
    next(err);
  }
};

export const updatePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { permissionId } = req.params;
    const { name, method, dataSourceId, status = 'active' } = req.body;
    const { organizationId } = req.user;
    let resourceId = '';
    let actualMethod = '';
    if (method.toLowerCase() === 'get') {
      resourceId = 'common/dataSource/dataSourceId/:dataSourceId';
      actualMethod = 'GET';
    } else if (method.toLowerCase() === 'update') {
      resourceId = '/common/dataSource/update/:dataSourceId';
      actualMethod = 'PUT';
    } else {
      res.status(400).json({ success: false, message: 'Invalid Method' });
    }

    const permission = await permissionService.updatePermission(permissionId, {
      name,
      method: actualMethod,
      resourceId,
      resourceType: 'Data Source',
      dataSourceId: new Types.ObjectId(dataSourceId),
      status,
      organizationId,
    });
    res.status(201).json({ success: true, data: permission });
  } catch (err) {
    next(err);
  }
};

export const deletePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { permissionId } = req.params;
    const { organizationId } = req.user;

    await permissionService.deletePermission(permissionId, organizationId);
    res.status(200).json({ success: true, message: 'Permission deleted successfully,' });
  } catch (err) {
    next(err);
  }
};
