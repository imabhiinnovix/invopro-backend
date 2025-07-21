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
  const exists = await Permission.findOne({
    method: data.method,
    resourceId: data.resourceId,
    organizationId: data.organizationId,
  });
  if (exists) {
    throw new Error('Permission with this method and resource already exists.');
  }
  const permission = new Permission(data);
  return await permission.save();
};

export const updatePermission = async (id: string, data: any) => {
  const existing = await Permission.findById(id);
  if (!existing) throw new Error('Permission not found.');

  // If updating status only (inactive -> active), handle separately
  const isReactivating =
    existing.status === 'inactive' &&
    data.status === 'active' &&
    (existing.method !== data.method ||
      existing.resourceId !== data.resourceId ||
      !existing.organizationId.equals(data.organizationId));

  const isChangingKeyFields =
    existing.method !== data.method ||
    existing.resourceId !== data.resourceId ||
    !existing.organizationId.equals(data.organizationId);

  // If method/resource/orgId are changing or reactivation is happening,
  // ensure no other active permission with same method/resource/orgId exists
  if ((isChangingKeyFields || isReactivating) && data.status !== 'inactive') {
    const conflict = await Permission.findOne({
      _id: { $ne: id }, // exclude self
      method: data.method,
      resourceId: data.resourceId,
      organizationId: data.organizationId,
      status: 'active',
    });

    if (conflict) {
      throw new Error('Another active permission with the same method, resourceId, and organization already exists.');
    }
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
