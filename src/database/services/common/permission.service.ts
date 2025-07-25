/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import Permission from '../../models/common/permissionModel';
import RoleHasPermission from '../../models/common/roleHasPermissionModel';

export const getPermissionList = async ({
  query,
  page = 1,
  limit = 20,
  sort = { createdAt: -1 },
  populate = [],
}: any) => {
  try {
    let queryBuilder = Permission.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    if (populate.length) {
      populate.forEach((field) => {
        queryBuilder = queryBuilder.populate(field);
      });
    }

    const data = await queryBuilder.exec();
    const totalCount = await Permission.countDocuments(query);

    return {
      data,
      totalCount,
    };
  } catch (err) {
    throw err;
  }
};

export const createPermission = async (data: any) => {
  const orgId = data.organizationId;

  const existing = await Permission.findOne({
    resourceCode: data.resourceCode,
    $or: [{ organizationId: orgId }, { organizationId: { $exists: false } }, { organizationId: null }],
  });

  if (existing) {
    throw new Error('Resource code already exists.');
  }

  const permission = new Permission(data);
  return await permission.save();
};

export const updatePermission = async (id: string, data: any) => {
  const existing = await Permission.findById(id);
  if (!existing) throw new Error('Permission not found.');

  // Check for duplicate resourceCode (excluding current ID)
  const duplicate = await Permission.findOne({
    _id: { $ne: id }, // Exclude the current permission
    resourceCode: data.resourceCode,
    $or: [{ organizationId: data.organizationId }, { organizationId: { $exists: false } }, { organizationId: null }],
  });

  if (duplicate) {
    throw new Error('Another permission with the same resourceCode already exists.');
  }

  const updated = await Permission.findByIdAndUpdate(id, data, { new: true });
  return updated;
};

export const deletePermission = async (id: string, organizationId: string) => {
  const permission = await Permission.findOne({
    _id: id,
    organizationId: new Types.ObjectId(organizationId),
  });

  if (!permission) {
    throw new Error('Permission not found for the given organization');
  }

  // Step 2: Remove associated RoleHasPermission entries
  await RoleHasPermission.deleteMany({ permissionId: new Types.ObjectId(id) });
  // Step 1: Delete the permission
  await Permission.findByIdAndDelete(id);

  return { success: true, message: 'Permission and associated role mappings deleted' };
};
