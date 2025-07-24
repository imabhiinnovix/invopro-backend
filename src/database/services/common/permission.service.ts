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
    $or: [
      {
        method: data.method,
        resourceId: data.resourceId,
        dataSourceId: data.dataSourceId,
        organizationId: orgId,
      },
      {
        name: data.name,
        $or: [{ organizationId: orgId }, { organizationId: { $exists: false } }],
      },
      {
        name: data.resourceCode,
        $or: [{ organizationId: orgId }, { organizationId: { $exists: false } }],
      },
    ],
  });

  if (existing) {
    // Decide whether it's a method/resourceId conflict or name conflict
    if (existing.method === data.method && existing.resourceId === data.resourceId) {
      throw new Error('Permission with this method and resource already exists.');
    }

    if (existing.name === data.name) {
      throw new Error('Permission name already exists.');
    }
    if (existing.resourceCode === data.resourceCode) {
      throw new Error('Resource code already exists.');
    }
  }

  const permission = new Permission(data);
  return await permission.save();
};

export const updatePermission = async (id: string, data: any) => {
  const existing = await Permission.findById(id);
  if (!existing) throw new Error('Permission not found.');

  const orgId = data.organizationId;
  if (String(existing.organizationId) != orgId) {
    throw new Error('You are not allowed to update the permission.');
  }

  // Check if name is changing and is already used
  if (data.name && data.name !== existing.name) {
    const nameConflict = await Permission.findOne({
      _id: { $ne: id }, // exclude self
      name: data.name,
      organizationId: { $or: [{ organizationId: orgId }, { organizationId: { $exists: false } }] },
    });

    if (nameConflict) {
      throw new Error('Permission name already exists.');
    }
  }

  // Determine if key fields changed
  const isChangingKeyFields =
    existing.method !== data.method ||
    existing.resourceId !== data.resourceId ||
    !existing.dataSourceId.equals(data.dataSourceId);

  // Determine if we are reactivating a previously inactive permission
  const isReactivating = existing.status === 'inactive' && data.status === 'active' && isChangingKeyFields;

  // If changing key fields or reactivating, check for conflict
  if ((isChangingKeyFields || isReactivating) && data.status !== 'inactive') {
    const conflict = await Permission.findOne({
      _id: { $ne: id },
      method: data.method,
      resourceId: data.resourceId,
      organizationId: orgId,
      dataSourceId: data.dataSourceId,
      status: 'active',
    });

    if (conflict) {
      throw new Error(
        'Another active permission with the same method, resourceId,datasourcId and organization already exists.'
      );
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
