import { Request, Response, NextFunction } from 'express';
import * as permissionService from '../../../database/services/common/permission.service';
import { Types } from 'mongoose';
const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const VALID_STATUS = ['active', 'inactive'];
const VALID_RESOURCE_TYPES = ['Datasource'];
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

const validatePermissionInput = (data: any): string | null => {
  if (!data.name) return 'Name is required';
  if (!data.method || !VALID_METHODS.includes(data.method)) return 'Invalid method';
  if (!data.resourceId || !Types.ObjectId.isValid(data.organizationId)) return 'Resource Id is required';

  if (!data.resourceType || !VALID_RESOURCE_TYPES.includes(data.resourceType)) return 'Valid ResourceType is required';
  if (data.status && !VALID_STATUS.includes(data.status)) return 'Invalid status';
  if (!data.organizationId) return 'Organization Id is required';
  return null;
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, method, resourceId, resourceType, status = 'active' } = req.body;
    const { organizationId } = req.user;
    const objResourceId = new Types.ObjectId(resourceId);
    const error = validatePermissionInput({
      name,
      method,
      resourceId: objResourceId,
      resourceType,
      status,
      organizationId,
    });
    if (error) return res.status(400).json({ success: false, message: error });

    const permission = await permissionService.createPermission(req.body);
    res.status(201).json({ success: true, data: permission });
  } catch (err) {
    next(err);
  }
};
